/**
 * Server-only client for the bot runtime service.
 *
 * The runtime is a separate long-lived process that owns the Discord gateway
 * connections (this app is only its control plane). Every outbound call goes
 * through here so timeouts, auth and error shapes stay in one place.
 *
 * Auth: `Authorization: Bearer ${BOT_RUNTIME_SHARED_SECRET}` — control plane to
 * runtime. The reverse direction uses BOT_RUNTIME_CALLBACK_SECRET, see
 * src/lib/internal-api-auth.server.ts.
 */
import { z } from "zod";
import type { BotRuntimeStatus } from "@/types/runtime";

const REQUEST_TIMEOUT_MS = 10_000;

export type RuntimeErrorCode = "config" | "unavailable" | "rejected";

export class RuntimeError extends Error {
  readonly code: RuntimeErrorCode;
  readonly status: number | undefined;

  constructor(code: RuntimeErrorCode, message: string, status?: number) {
    super(message);
    // `name` is checked by isRuntimeError so the guard survives bundling and
    // dynamic imports (where instanceof across module copies is unreliable).
    this.name = "RuntimeError";
    this.code = code;
    this.status = status;
  }
}

export function isRuntimeError(value: unknown): value is RuntimeError {
  return value instanceof Error && value.name === "RuntimeError" && "code" in value;
}

interface RuntimeConfig {
  baseUrl: string;
  secret: string;
}

let cachedConfig: RuntimeConfig | undefined;

function readConfig(): RuntimeConfig {
  if (cachedConfig) return cachedConfig;

  const baseUrl = process.env["BOT_RUNTIME_URL"];
  const secret = process.env["BOT_RUNTIME_SHARED_SECRET"];
  const missing = [
    ...(!baseUrl ? ["BOT_RUNTIME_URL"] : []),
    ...(!secret ? ["BOT_RUNTIME_SHARED_SECRET"] : []),
  ];

  if (!baseUrl || !secret) {
    throw new RuntimeError(
      "config",
      `Missing bot runtime environment variable(s): ${missing.join(", ")}.`,
    );
  }

  cachedConfig = { baseUrl: baseUrl.replace(/\/+$/, ""), secret };
  return cachedConfig;
}

const runtimeStatusSchema = z.object({
  state: z.enum(["offline", "starting", "online", "stopping", "error"]),
  startedAt: z.string().nullish(),
  lastError: z.string().nullish(),
  guildCount: z.number().int().nonnegative().nullish(),
  username: z.string().nullish(),
});

export type RuntimeStatusPayload = z.infer<typeof runtimeStatusSchema>;

async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return "";
  }
}

async function call(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<RuntimeStatusPayload> {
  const { baseUrl, secret } = readConfig();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: init.method,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${secret}`,
        accept: "application/json",
        ...(init.body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    throw new RuntimeError(
      "unavailable",
      aborted ? "The bot runtime did not respond in time." : "Could not reach the bot runtime.",
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401 || response.status === 403) {
    throw new RuntimeError(
      "rejected",
      "The bot runtime rejected the control-plane credentials.",
      response.status,
    );
  }

  if (!response.ok) {
    const detail = await safeText(response);
    throw new RuntimeError(
      "rejected",
      detail || `The bot runtime returned ${response.status}.`,
      response.status,
    );
  }

  const parsed = runtimeStatusSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    throw new RuntimeError("unavailable", "The bot runtime returned an unexpected payload.");
  }
  return parsed.data;
}

export function toStatus(
  botId: string,
  payload: RuntimeStatusPayload,
  updatedAt: string,
): BotRuntimeStatus {
  return {
    botId,
    state: payload.state,
    startedAt: payload.startedAt ?? null,
    updatedAt,
    lastError: payload.lastError ?? null,
    guildCount: payload.guildCount ?? null,
    username: payload.username ?? null,
  };
}

/** Turns a runtime failure into a message that is safe to show a user. */
export function describeRuntimeFailure(error: unknown, fallback: string): string {
  if (!isRuntimeError(error)) return fallback;

  switch (error.code) {
    case "config":
      return "Bot hosting is not configured on this server yet.";
    case "unavailable":
      return "The bot runtime is not responding. Try again in a moment.";
    case "rejected":
      return error.status === 404
        ? "The runtime does not know this bot yet. Try again."
        : `The bot runtime refused the request (${error.status ?? 500}).`;
    default:
      return fallback;
  }
}

function botPath(botId: string, suffix = ""): string {
  return `/v1/bots/${encodeURIComponent(botId)}${suffix}`;
}

export function runtimeStart(botId: string, userId: string): Promise<RuntimeStatusPayload> {
  return call(botPath(botId, "/start"), { method: "POST", body: { botId, userId } });
}

export function runtimeStop(botId: string, userId: string): Promise<RuntimeStatusPayload> {
  return call(botPath(botId, "/stop"), { method: "POST", body: { botId, userId } });
}

export function runtimeStatus(botId: string, userId: string): Promise<RuntimeStatusPayload> {
  return call(`${botPath(botId)}?userId=${encodeURIComponent(userId)}`, { method: "GET" });
}