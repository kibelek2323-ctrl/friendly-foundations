/**
 * Owns the live BotSession map and the process-wide capacity limit.
 *
 * Sessions are keyed by userId + botId: bot ids are per-user strings from the
 * dashboard, so they are only unique within an owner.
 */
import { config } from "./config.js";
import { logger } from "./logger.js";
import { BotSession } from "./session.js";
import { OFFLINE_STATUS, type RuntimeStatusPayload } from "./types.js";

const SWEEP_INTERVAL_MS = 5 * 60_000;

export class CapacityError extends Error {
  constructor(limit: number) {
    super(`This runtime is already hosting its maximum of ${limit} bots.`);
    this.name = "CapacityError";
  }
}

const sessions = new Map<string, BotSession>();

function key(userId: string, botId: string): string {
  return `${userId}:${botId}`;
}

function activeCount(): number {
  let count = 0;
  for (const session of sessions.values()) {
    if (session.isActive()) count += 1;
  }
  return count;
}

export function statusOf(userId: string, botId: string): RuntimeStatusPayload {
  // An unknown bot is simply offline — the control plane treats this as "not running".
  return sessions.get(key(userId, botId))?.status() ?? OFFLINE_STATUS;
}

export async function startBot(userId: string, botId: string): Promise<RuntimeStatusPayload> {
  const mapKey = key(userId, botId);
  let session = sessions.get(mapKey);

  if (!session) {
    if (activeCount() >= config.maxConcurrentBots) {
      throw new CapacityError(config.maxConcurrentBots);
    }
    session = new BotSession(botId, userId);
    sessions.set(mapKey, session);
  }

  const status = await session.start();
  // A failed start leaves nothing to hold on to.
  if (session.isIdle()) sessions.delete(mapKey);
  return status;
}

export async function stopBot(userId: string, botId: string): Promise<RuntimeStatusPayload> {
  const mapKey = key(userId, botId);
  const session = sessions.get(mapKey);
  if (!session) return OFFLINE_STATUS;

  const status = await session.stop();
  if (session.isIdle()) sessions.delete(mapKey);
  return status;
}

export function runtimeSnapshot(): { total: number; active: number } {
  return { total: sessions.size, active: activeCount() };
}

/** Drops sessions that hold no connection, so the map cannot grow without bound. */
function sweep(): void {
  let removed = 0;
  for (const [mapKey, session] of sessions) {
    if (session.isIdle()) {
      sessions.delete(mapKey);
      removed += 1;
    }
  }
  if (removed > 0) logger.debug(`Swept ${removed} idle bot session(s).`);
}

export function startSweeper(): () => void {
  const timer = setInterval(sweep, SWEEP_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}

/** Disconnects everything and tells the control plane, so no bot is left "online". */
export async function shutdownAll(): Promise<void> {
  const live = [...sessions.values()].filter((session) => !session.isIdle());
  if (live.length === 0) return;

  logger.info(`Disconnecting ${live.length} bot(s) before shutdown.`);
  await Promise.allSettled(live.map((session) => session.stop("shutdown")));
  sessions.clear();
}