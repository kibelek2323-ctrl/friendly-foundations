/**
 * Control-plane facing HTTP API.
 *
 * Contract (see src/lib/runtime-client.server.ts in the web app):
 *   POST /v1/bots/:botId/start   body { botId, userId }  -> RuntimeStatusPayload
 *   POST /v1/bots/:botId/stop    body { botId, userId }  -> RuntimeStatusPayload
 *   GET  /v1/bots/:botId?userId= -> RuntimeStatusPayload
 *   GET  /healthz                -> liveness
 *
 * SECURITY: /v1/* is authenticated ONLY by BOT_RUNTIME_SHARED_SECRET — there is
 * no user session here. Anyone who can reach this port and holds the secret can
 * start or stop any bot, so also restrict it at the network layer (private
 * network, security group, or an authenticating proxy) and rotate the secret if
 * it is ever exposed. /healthz is unauthenticated by design and reveals nothing
 * beyond liveness unless the caller presents the secret.
 */
import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { describeError } from "./redact.js";
import { CapacityError, runtimeSnapshot, startBot, statusOf, stopBot } from "./supervisor.js";
import type { RuntimeStatusPayload } from "./types.js";

const MAX_BODY_BYTES = 64 * 1024;
const BEARER_PREFIX = "Bearer ";
const BOT_ID_PATTERN = /^[A-Za-z0-9._:-]{1,64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(payload).toString(),
  });
  res.end(payload);
}

/** Length check first, then a constant-time compare of equal-length buffers. */
function secretMatches(provided: string, expected: string): boolean {
  const left = Buffer.from(provided, "utf8");
  const right = Buffer.from(expected, "utf8");
  if (left.byteLength !== right.byteLength) return false;
  return timingSafeEqual(left, right);
}

function isAuthorized(req: http.IncomingMessage): boolean {
  const header = req.headers["authorization"];
  if (typeof header !== "string" || !header.startsWith(BEARER_PREFIX)) return false;
  return secretMatches(header.slice(BEARER_PREFIX.length), config.inboundSecret);
}

function requireAuth(req: http.IncomingMessage): void {
  if (!isAuthorized(req)) throw new HttpError(401, "Unauthorized.");
}

async function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.byteLength;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, "Request body is too large.");
    chunks.push(chunk);
  }

  if (size === 0) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new HttpError(400, "Request body must be a JSON object.");
  }
  return parsed as Record<string, unknown>;
}

function requireBotId(raw: string | undefined): string {
  const botId = raw === undefined ? "" : decodeURIComponent(raw);
  if (!BOT_ID_PATTERN.test(botId)) throw new HttpError(400, "Invalid bot id.");
  return botId;
}

function requireUserId(raw: unknown): string {
  if (typeof raw !== "string" || !UUID_PATTERN.test(raw)) {
    throw new HttpError(400, "A valid userId (UUID) is required.");
  }
  return raw;
}

function withBotId(botId: string, status: RuntimeStatusPayload): RuntimeStatusPayload & {
  botId: string;
} {
  return { botId, ...status };
}

async function handleCommand(
  req: http.IncomingMessage,
  botId: string,
  action: "start" | "stop",
): Promise<RuntimeStatusPayload> {
  const body = await readJsonBody(req);
  const userId = requireUserId(body["userId"]);

  // The body carries botId too; a mismatch means a malformed caller, not a bot.
  const bodyBotId = body["botId"];
  if (typeof bodyBotId === "string" && bodyBotId !== botId) {
    throw new HttpError(400, "botId in the body does not match the URL.");
  }

  logger.info(`${action} requested for bot ${botId}.`);
  return action === "start" ? startBot(userId, botId) : stopBot(userId, botId);
}

async function route(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const method = req.method ?? "GET";
  const url = new URL(req.url ?? "/", "http://runtime.invalid");
  const segments = url.pathname.split("/").filter((part) => part.length > 0);

  if (segments.length === 1 && segments[0] === "healthz") {
    if (method !== "GET") throw new HttpError(405, "Method not allowed.");
    // Detail only for authenticated callers; bare liveness for load balancers.
    const detail = isAuthorized(req)
      ? { ...runtimeSnapshot(), uptimeSeconds: Math.round(process.uptime()) }
      : {};
    sendJson(res, 200, { ok: true, ...detail });
    return;
  }

  if (segments[0] !== "v1" || segments[1] !== "bots") {
    throw new HttpError(404, "Not found.");
  }

  requireAuth(req);

  const botId = requireBotId(segments[2]);

  // GET /v1/bots/:botId?userId=
  if (segments.length === 3 && method === "GET") {
    const userId = requireUserId(url.searchParams.get("userId"));
    sendJson(res, 200, withBotId(botId, statusOf(userId, botId)));
    return;
  }

  // POST /v1/bots/:botId/start | /stop
  if (segments.length === 4 && method === "POST") {
    const action = segments[3];
    if (action !== "start" && action !== "stop") throw new HttpError(404, "Not found.");
    const status = await handleCommand(req, botId, action);
    sendJson(res, 200, withBotId(botId, status));
    return;
  }

  if (segments.length === 3 || segments.length === 4) {
    throw new HttpError(405, "Method not allowed.");
  }
  throw new HttpError(404, "Not found.");
}

export function createRuntimeServer(): http.Server {
  const server = http.createServer((req, res) => {
    void route(req, res).catch((error: unknown) => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (error instanceof HttpError) {
        sendJson(res, error.status, { ok: false, error: error.message });
        return;
      }
      if (error instanceof CapacityError) {
        sendJson(res, 503, { ok: false, error: error.message });
        return;
      }
      logger.error(`Unhandled request error: ${describeError(error)}`, error);
      sendJson(res, 500, { ok: false, error: "Internal runtime error." });
    });
  });

  server.headersTimeout = 15_000;
  server.requestTimeout = 30_000;
  server.keepAliveTimeout = 20_000;
  return server;
}