/**
 * Defence in depth for log lines and user-visible error text.
 *
 * discord.js error messages and HTTP bodies can echo back credentials, and
 * everything we report ends up in bot_runtime_events, which the dashboard shows
 * to the bot owner. Scrub anything token-shaped before it leaves the process.
 */

/** Discord bot tokens: three base64url segments separated by dots. */
const DISCORD_TOKEN = /[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{20,}/g;
/** `Bot <token>` / `Bearer <token>` in copied headers. */
const AUTH_HEADER = /\b(Bot|Bearer)\s+[A-Za-z0-9._-]{8,}/gi;

export function scrubSecrets(value: string): string {
  return value.replace(DISCORD_TOKEN, "[redacted-token]").replace(AUTH_HEADER, "$1 [redacted]");
}

/** Short, scrubbed, single-line description of an unknown thrown value. */
export function describeError(error: unknown, maxLength = 300): string {
  const raw =
    error instanceof Error
      ? error.message || error.name
      : typeof error === "string"
        ? error
        : "Unknown error";
  return scrubSecrets(raw).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

/** discord.js attaches stable string codes (TokenInvalid, DisallowedIntents, …). */
export function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}