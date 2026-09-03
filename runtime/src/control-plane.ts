/**
 * Outbound calls to the web app's internal API.
 *
 * Auth: Authorization: Bearer ${BOT_RUNTIME_CALLBACK_SECRET} — see
 * src/lib/internal-api-auth.server.ts in the web app. The runtime never touches
 * Supabase directly; the control plane owns all database access.
 */
import { config } from "./config.js";
import { logger } from "./logger.js";
import { describeError } from "./redact.js";
import type { EncryptedBotToken, RuntimeReport } from "./types.js";

const TOKEN_TIMEOUT_MS = 8_000;
const REPORT_TIMEOUT_MS = 8_000;
const REPORT_RETRY_DELAY_MS = 750;

/** Caps mirroring the control plane's zod schema, so a report is never rejected. */
const MAX_EVENTS = 50;
const MAX_EVENT_NAME = 120;
const MAX_DESCRIPTION = 2_000;
const MAX_USERNAME = 120;

export type ControlPlaneErrorKind = "missing" | "unauthorized" | "unavailable" | "invalid";

export class ControlPlaneError extends Error {
  readonly kind: ControlPlaneErrorKind;
  readonly status: number | undefined;

  constructor(kind: ControlPlaneErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ControlPlaneError";
    this.kind = kind;
    this.status = status;
  }
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${config.callbackSecret}`,
    accept: "application/json",
    ...extra,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Fetches the ENCRYPTED token record for one bot. Plaintext never crosses the wire. */
export async function fetchEncryptedToken(
  botId: string,
  userId: string,
): Promise<EncryptedBotToken> {
  const url =
    `${config.controlPlaneUrl}/api/internal/bots/${encodeURIComponent(botId)}/token` +
    `?userId=${encodeURIComponent(userId)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: authHeaders(),
      signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
    });
  } catch (error) {
    throw new ControlPlaneError(
      "unavailable",
      `Could not reach the control plane for a token: ${describeError(error)}`,
    );
  }

  if (response.status === 404) {
    throw new ControlPlaneError("missing", "No token is stored for this bot.", 404);
  }
  if (response.status === 401 || response.status === 403) {
    throw new ControlPlaneError(
      "unauthorized",
      "The control plane rejected the runtime callback secret.",
      response.status,
    );
  }
  if (!response.ok) {
    throw new ControlPlaneError(
      "unavailable",
      `The control plane returned ${response.status} for a token lookup.`,
      response.status,
    );
  }

  const body: unknown = await response.json().catch(() => null);
  if (typeof body !== "object" || body === null) {
    throw new ControlPlaneError("invalid", "Token lookup returned a non-JSON body.");
  }

  const record = body as {
    ok?: unknown;
    ciphertext?: unknown;
    iv?: unknown;
    keyVersion?: unknown;
    applicationId?: unknown;
  };

  if (
    record.ok !== true ||
    typeof record.ciphertext !== "string" ||
    typeof record.iv !== "string" ||
    typeof record.keyVersion !== "number"
  ) {
    throw new ControlPlaneError("invalid", "Token lookup returned an unexpected payload.");
  }

  return {
    ciphertext: record.ciphertext,
    iv: record.iv,
    keyVersion: record.keyVersion,
    applicationId: typeof record.applicationId === "string" ? record.applicationId : null,
  };
}

function clampReport(report: RuntimeReport): RuntimeReport {
  return {
    botId: report.botId,
    userId: report.userId,
    state: report.state,
    startedAt: report.startedAt,
    lastError: report.lastError === null ? null : report.lastError.slice(0, MAX_DESCRIPTION),
    guildCount:
      report.guildCount === null ? null : Math.max(0, Math.trunc(report.guildCount)),
    username: report.username === null ? null : report.username.slice(0, MAX_USERNAME),
    events: report.events.slice(0, MAX_EVENTS).map((entry) => ({
      event: entry.event.slice(0, MAX_EVENT_NAME),
      level: entry.level,
      description: entry.description.slice(0, MAX_DESCRIPTION),
      at: entry.at,
    })),
  };
}

async function postReport(body: RuntimeReport): Promise<{ ok: boolean; retryable: boolean }> {
  try {
    const response = await fetch(`${config.controlPlaneUrl}/api/internal/runtime/events`, {
      method: "POST",
      headers: authHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REPORT_TIMEOUT_MS),
    });

    if (response.ok) return { ok: true, retryable: false };

    // 400 means our payload is wrong — retrying cannot help.
    const retryable = response.status >= 500 || response.status === 429;
    logger.warn(
      `Control plane rejected a runtime report for bot ${body.botId} (${response.status}).`,
    );
    return { ok: false, retryable };
  } catch (error) {
    logger.warn(`Runtime report for bot ${body.botId} failed: ${describeError(error)}`);
    return { ok: false, retryable: true };
  }
}

/**
 * Pushes state + activity to the control plane. Never throws: a reporting
 * failure must not tear down a working gateway connection. The dashboard's own
 * status probe re-reads live state, so a dropped report is self-healing.
 */
export async function reportRuntimeState(report: RuntimeReport): Promise<boolean> {
  const body = clampReport(report);

  const first = await postReport(body);
  if (first.ok) return true;
  if (!first.retryable) return false;

  await sleep(REPORT_RETRY_DELAY_MS);
  const second = await postReport(body);
  if (!second.ok) {
    logger.error(`Giving up on runtime report for bot ${body.botId} (state: ${body.state}).`);
  }
  return second.ok;
}