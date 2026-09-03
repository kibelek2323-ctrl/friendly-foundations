/**
 * Wire types shared with the control plane.
 *
 * These MUST stay in sync with:
 *   src/types/runtime.ts                (dashboard-facing shapes)
 *   src/lib/runtime-client.server.ts    (runtimeStatusSchema — our HTTP responses)
 *   src/lib/bot-runtime-store.server.ts (callbackSchema — our callback payloads)
 */

export type RuntimeState = "offline" | "starting" | "online" | "stopping" | "error";

export type RuntimeEventLevel = "info" | "success" | "warning" | "error";

/** Exactly the payload `runtimeStatusSchema` in the control plane parses. */
export interface RuntimeStatusPayload {
  state: RuntimeState;
  startedAt: string | null;
  lastError: string | null;
  guildCount: number | null;
  username: string | null;
}

/** One activity entry pushed to /api/internal/runtime/events. */
export interface RuntimeEvent {
  event: string;
  level: RuntimeEventLevel;
  description: string;
  /** ISO 8601 timestamp on the runtime. */
  at: string;
}

/** Full callback body accepted by the control plane. */
export interface RuntimeReport extends RuntimeStatusPayload {
  botId: string;
  userId: string;
  events: RuntimeEvent[];
}

/** Encrypted token record as served by /api/internal/bots/:botId/token. */
export interface EncryptedBotToken {
  ciphertext: string;
  iv: string;
  keyVersion: number;
  applicationId: string | null;
}

export const OFFLINE_STATUS: RuntimeStatusPayload = {
  state: "offline",
  startedAt: null,
  lastError: null,
  guildCount: null,
  username: null,
};

export function nowIso(): string {
  return new Date().toISOString();
}