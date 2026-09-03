/**
 * Shape validation and public-metadata extraction for Discord bot tokens.
 *
 * Nothing here logs, returns or persists a token. Format checks are intentionally
 * loose — the authoritative check is a live call to Discord in setBotToken.
 */

// <base64url application id>.<base64url timestamp>.<hmac>
const BOT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}\.[A-Za-z0-9_-]{4,16}\.[A-Za-z0-9_-]{20,80}$/;

export function looksLikeDiscordBotToken(value: string): boolean {
  return BOT_TOKEN_PATTERN.test(value.trim());
}

/**
 * Decodes the application (client) id embedded in the token's first segment.
 * This is public information — it is the id you put in an OAuth invite URL.
 * Returns null when the token is malformed.
 */
export function parseApplicationIdFromToken(value: string): string | null {
  const firstSegment = value.trim().split(".")[0];
  if (!firstSegment) return null;

  try {
    const normalized = firstSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = atob(padded);
    return /^\d{17,20}$/.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}
