/**
 * Shared-secret gate for the internal runtime API (/api/internal/*).
 *
 * SECURITY: these routes are network-reachable and have NO Supabase session
 * behind them — the runtime is a server-to-server caller. The only thing
 * protecting them is BOT_RUNTIME_CALLBACK_SECRET, so:
 *   * keep the value long and random (>= 32 chars) and never reference it from
 *     client code,
 *   * prefer restricting /api/internal/* at the edge/proxy as well,
 *   * rotate it if it ever appears in a log or a build artefact.
 */
const MIN_SECRET_LENGTH = 32;
const BEARER_PREFIX = "Bearer ";

function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

/** Length-independent comparison, so a wrong secret leaks no timing signal. */
function constantTimeEquals(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return diff === 0;
}

/**
 * Returns `null` when the caller is the trusted runtime, otherwise the Response
 * the handler should return immediately.
 */
export function checkInternalRequest(request: Request): Response | null {
  const secret = process.env["BOT_RUNTIME_CALLBACK_SECRET"];

  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    console.error(
      "[internal-api] BOT_RUNTIME_CALLBACK_SECRET is missing or shorter than 32 characters.",
    );
    return jsonResponse({ ok: false, error: "Internal API is not configured." }, 503);
  }

  const header = request.headers.get("authorization");
  if (
    !header ||
    !header.startsWith(BEARER_PREFIX) ||
    !constantTimeEquals(header.slice(BEARER_PREFIX.length), secret)
  ) {
    return jsonResponse({ ok: false, error: "Unauthorized." }, 401);
  }

  return null;
}