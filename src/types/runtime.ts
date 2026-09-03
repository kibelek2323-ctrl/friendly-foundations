/**
 * Shared runtime-control types.
 *
 * Safe to import from the browser: nothing here is a secret and nothing here
 * pulls in server-only modules.
 */
import type { LogLevel } from "@/types/bot";

/** Lifecycle of a single bot's gateway connection, as reported by the runtime. */
export type RuntimeState = "offline" | "starting" | "online" | "stopping" | "error";

export type RuntimeEventLevel = LogLevel;

export interface BotRuntimeStatus {
  botId: string;
  state: RuntimeState;
  /** When the current gateway session came up, ISO 8601, or null. */
  startedAt: string | null;
  /** When this status was last written/observed, ISO 8601, or null. */
  updatedAt: string | null;
  lastError: string | null;
  guildCount: number | null;
  /** Discord username the gateway logged in as, when the runtime knows it. */
  username: string | null;
}

/** An activity entry pushed by the runtime. */
export interface RuntimeEvent {
  event: string;
  level: RuntimeEventLevel;
  description: string;
  /** ISO 8601 timestamp of the event on the runtime. */
  at: string;
}

/**
 * A persisted runtime event as handed to the browser.
 * Field names match `LogEntry` so both can be rendered by the same list.
 */
export interface RuntimeEventRecord {
  id: string;
  event: string;
  level: RuntimeEventLevel;
  description: string;
  timestamp: string;
}

export interface RuntimeCommandResult {
  ok: boolean;
  /** Explicit `| undefined` because the project runs exactOptionalPropertyTypes. */
  error?: string | undefined;
  status?: BotRuntimeStatus | undefined;
}