/**
 * One bot = one BotSession = one Discord gateway connection.
 *
 * The session is the source of truth for that bot's state and pushes every
 * transition to the control plane, so the dashboard stays truthful without
 * anyone polling Discord. start()/stop() are serialised through a promise chain,
 * so double clicks and a stop landing mid-start cannot interleave.
 */
import { Client, Events } from "discord.js";
import { config } from "./config.js";
import { ControlPlaneError, fetchEncryptedToken, reportRuntimeState } from "./control-plane.js";
import { decryptBotToken, isDecryptionFailure } from "./crypto.js";
import { logger } from "./logger.js";
import { describeError, errorCode, scrubSecrets } from "./redact.js";
import { nowIso, type RuntimeEvent, type RuntimeState, type RuntimeStatusPayload } from "./types.js";

/** Turns a token-acquisition failure into text that is safe to show the owner. */
function describeTokenFailure(error: unknown): string {
  if (error instanceof ControlPlaneError) {
    switch (error.kind) {
      case "missing":
        return "No verified bot token is stored for this bot. Add one in Settings, then start it again.";
      case "unauthorized":
        // Operator misconfiguration: keep the detail in the logs only.
        logger.error(`Control plane rejected the callback secret: ${error.message}`);
        return "Bot hosting is misconfigured on the server. Contact support.";
      case "invalid":
        logger.error(`Malformed token payload from the control plane: ${error.message}`);
        return "The stored token could not be read. Save it again in Settings.";
      case "unavailable":
      default:
        return "The runtime could not reach the control plane. Try again in a moment.";
    }
  }

  if (isDecryptionFailure(error)) {
    logger.error(`Token decryption failed: ${describeError(error)}`);
    return "The stored token could not be decrypted. Save it again in Settings.";
  }

  logger.error(`Unexpected token failure: ${describeError(error)}`);
  return "The runtime could not load this bot's token.";
}

/** Same, for a failed gateway login. */
function describeLoginFailure(error: unknown): string {
  const code = errorCode(error);

  if (code === "TokenInvalid") {
    return "Discord rejected the stored token. Reset it in the developer portal and save the new one.";
  }
  if (code === "DisallowedIntents") {
    return "Discord refused the requested gateway intents. Enable the privileged intents for this application in the developer portal.";
  }
  if (code === "ShardingRequired") {
    return "This bot is in too many servers for a single connection. Contact support to enable sharding.";
  }

  return `Could not connect this bot to Discord: ${describeError(error, 200)}`;
}

export class BotSession {
  readonly botId: string;
  readonly userId: string;

  private state: RuntimeState = "offline";
  private client: Client | null = null;
  private startedAt: string | null = null;
  private lastError: string | null = null;
  private guildCount: number | null = null;
  private username: string | null = null;

  /** Set while a deliberate stop is in flight, so close events stay quiet. */
  private stopping = false;
  /** Serialises start/stop. Rejections are absorbed so the chain never dies. */
  private chain: Promise<unknown> = Promise.resolve();

  constructor(botId: string, userId: string) {
    this.botId = botId;
    this.userId = userId;
  }

  status(): RuntimeStatusPayload {
    return {
      state: this.state,
      startedAt: this.startedAt,
      lastError: this.lastError,
      guildCount: this.guildCount,
      username: this.username,
    };
  }

  /** True when this session holds no connection and can be dropped from the map. */
  isIdle(): boolean {
    return this.client === null && (this.state === "offline" || this.state === "error");
  }

  isActive(): boolean {
    return this.state !== "offline";
  }

  start(): Promise<RuntimeStatusPayload> {
    return this.enqueue(() => this.startNow());
  }

  stop(reason: "command" | "shutdown" = "command"): Promise<RuntimeStatusPayload> {
    return this.enqueue(() => this.stopNow(reason));
  }

  private enqueue(task: () => Promise<RuntimeStatusPayload>): Promise<RuntimeStatusPayload> {
    // then(task, task): the next command runs whatever the previous one did.
    const next = this.chain.then(task, task);
    this.chain = next.catch(() => undefined);
    return next;
  }

  private async startNow(): Promise<RuntimeStatusPayload> {
    if (this.state === "online" || this.state === "starting") return this.status();

    await this.teardownClient();
    this.stopping = false;
    this.state = "starting";
    this.lastError = null;

    await this.report([
      {
        event: "runtime.starting",
        level: "info",
        description: "Runtime is connecting this bot to the Discord gateway.",
        at: nowIso(),
      },
    ]);

    let token: string;
    try {
      const sealed = await fetchEncryptedToken(this.botId, this.userId);
      token = await decryptBotToken(sealed);
    } catch (error) {
      return this.fail(describeTokenFailure(error));
    }

    const client = new Client({ intents: config.intents });
    this.client = client;
    this.attach(client);

    try {
      // Resolves once IDENTIFY is sent; ClientReady flips us to "online" after.
      await client.login(token);
    } catch (error) {
      logger.error(`Login failed for bot ${this.botId}: ${describeError(error)}`);
      await this.teardownClient();
      return this.fail(describeLoginFailure(error));
    } finally {
      token = "";
    }

    logger.info(`Bot ${this.botId} identified with Discord, waiting for ready.`);
    return this.status();
  }

  private async stopNow(reason: "command" | "shutdown"): Promise<RuntimeStatusPayload> {
    if (this.client === null && this.state === "offline") return this.status();

    this.stopping = true;
    if (this.client !== null) this.state = "stopping";

    await this.teardownClient();

    this.state = "offline";
    this.startedAt = null;
    this.guildCount = null;
    this.username = null;
    this.lastError = null;
    this.stopping = false;

    await this.report([
      reason === "shutdown"
        ? {
            event: "runtime.shutdown",
            level: "warning",
            description: "The runtime is restarting; this bot was disconnected and must be started again.",
            at: nowIso(),
          }
        : {
            event: "runtime.stop",
            level: "warning",
            description: "Runtime disconnected this bot from the Discord gateway.",
            at: nowIso(),
          },
    ]);

    logger.info(`Bot ${this.botId} stopped (${reason}).`);
    return this.status();
  }

  /** Moves to the error state, reports it, and returns the status to the caller. */
  private async fail(message: string): Promise<RuntimeStatusPayload> {
    this.state = "error";
    this.startedAt = null;
    this.guildCount = null;
    this.username = null;
    this.lastError = scrubSecrets(message);

    await this.report([
      {
        event: "runtime.error",
        level: "error",
        description: this.lastError,
        at: nowIso(),
      },
    ]);

    return this.status();
  }

  private attach(client: Client): void {
    client.once(Events.ClientReady, () => {
      void this.onReady();
    });

    client.on(Events.Error, (error: Error) => {
      void this.onClientError(error);
    });

    client.on(Events.ShardDisconnect, (event: { code: number }, shardId: number) => {
      void this.onShardDisconnect(event.code, shardId);
    });

    client.on(Events.ShardReconnecting, (shardId: number) => {
      void this.onShardReconnecting(shardId);
    });

    client.on(Events.ShardResume, (shardId: number) => {
      void this.onShardResume(shardId);
    });

    // Guild counts change often; refresh locally and let the next status probe
    // or state change carry the new number instead of spamming callbacks.
    client.on(Events.GuildCreate, () => this.syncGuildCount());
    client.on(Events.GuildDelete, () => this.syncGuildCount());
  }

  private syncGuildCount(): void {
    if (this.client === null) return;
    this.guildCount = this.client.guilds.cache.size;
  }

  private async onReady(): Promise<void> {
    const client = this.client;
    if (client === null) return;

    this.state = "online";
    this.startedAt = nowIso();
    this.lastError = null;
    this.username = client.user?.tag ?? null;
    this.guildCount = client.guilds.cache.size;

    logger.info(`Bot ${this.botId} online as ${this.username ?? "unknown"}.`);

    await this.report([
      {
        event: "gateway.ready",
        level: "success",
        description: `Connected to Discord as ${this.username ?? "unknown"} in ${this.guildCount} server(s).`,
        at: nowIso(),
      },
    ]);
  }

  private async onClientError(error: Error): Promise<void> {
    const message = describeError(error, 200);
    logger.warn(`Client error for bot ${this.botId}: ${message}`);
    // discord.js recovers from most of these, so the state is left alone.
    this.lastError = message;

    await this.report([
      {
        event: "gateway.error",
        level: "error",
        description: message,
        at: nowIso(),
      },
    ]);
  }

  private async onShardDisconnect(code: number, shardId: number): Promise<void> {
    // A deliberate stop reports its own terminal state.
    if (this.stopping) return;

    logger.warn(`Bot ${this.botId} shard ${shardId} closed with code ${code} and will not resume.`);
    await this.teardownClient();
    await this.fail(
      `Discord closed the gateway connection (code ${code}) and it cannot be resumed. Start the bot again.`,
    );
  }

  private async onShardReconnecting(shardId: number): Promise<void> {
    if (this.stopping || this.state === "offline") return;

    // Truthful: mid-reconnect the bot is not serving traffic.
    if (this.state === "online") this.state = "starting";

    await this.report([
      {
        event: "gateway.reconnecting",
        level: "warning",
        description: `Lost the gateway connection (shard ${shardId}); reconnecting.`,
        at: nowIso(),
      },
    ]);
  }

  private async onShardResume(shardId: number): Promise<void> {
    if (this.stopping || this.client === null) return;

    this.state = "online";
    this.lastError = null;
    this.syncGuildCount();

    await this.report([
      {
        event: "gateway.resumed",
        level: "success",
        description: `Gateway session resumed (shard ${shardId}).`,
        at: nowIso(),
      },
    ]);
  }

  private async teardownClient(): Promise<void> {
    const client = this.client;
    this.client = null;
    if (client === null) return;

    // Detach first: a destroyed client must not push more state.
    client.removeAllListeners();
    try {
      // destroy() is sync in some 14.x releases and async in others.
      await Promise.resolve(client.destroy());
    } catch (error) {
      logger.warn(`Error destroying client for bot ${this.botId}: ${describeError(error)}`);
    }
  }

  private async report(events: RuntimeEvent[]): Promise<void> {
    const status = this.status();
    await reportRuntimeState({
      botId: this.botId,
      userId: this.userId,
      state: status.state,
      startedAt: status.startedAt,
      lastError: status.lastError,
      guildCount: status.guildCount,
      username: status.username,
      events,
    });
  }
}