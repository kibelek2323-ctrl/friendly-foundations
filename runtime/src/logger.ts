/**
 * Minimal levelled logger.
 *
 * Reads its own env var so it has no dependency on config.ts (which logs while
 * validating). Never log a bot token, a decrypted secret, or a raw callback
 * secret — use scrubSecrets() from ./redact.ts for anything Discord-derived.
 */
type Level = "debug" | "info" | "warn" | "error";

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function resolveThreshold(): number {
  const raw = (process.env["BOT_RUNTIME_LOG_LEVEL"] ?? "info").toLowerCase();
  return ORDER[raw as Level] ?? ORDER.info;
}

const threshold = resolveThreshold();

function emit(level: Level, message: string, extra: unknown[]): void {
  if (ORDER[level] < threshold) return;
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${message}`;
  if (level === "error") console.error(line, ...extra);
  else if (level === "warn") console.warn(line, ...extra);
  else console.log(line, ...extra);
}

export const logger = {
  debug: (message: string, ...extra: unknown[]) => emit("debug", message, extra),
  info: (message: string, ...extra: unknown[]) => emit("info", message, extra),
  warn: (message: string, ...extra: unknown[]) => emit("warn", message, extra),
  error: (message: string, ...extra: unknown[]) => emit("error", message, extra),
};