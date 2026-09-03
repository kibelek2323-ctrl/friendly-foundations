/**
 * Defence in depth against a bot token ever re-entering client-visible state.
 *
 * `Bot` no longer declares a `token` field, but older localStorage snapshots and
 * older `bots.data` rows still contain one, and a stale build could write one
 * back. Everything that persists or receives a Bot object runs it through here.
 */

/** Keys that must never survive into localStorage or the `bots.data` payload. */
const SECRET_BOT_KEYS = ["token", "botToken", "discordToken"] as const;

export function stripBotSecrets<T extends object>(bot: T): T {
  const record = bot as Record<string, unknown>;
  const hasSecret = SECRET_BOT_KEYS.some((key) => key in record);
  if (!hasSecret) return bot; // preserve referential identity for store equality checks

  const clean: Record<string, unknown> = { ...record };
  for (const key of SECRET_BOT_KEYS) {
    delete clean[key];
  }
  return clean as T;
}

export function stripBotSecretsFromList<T extends object>(bots: readonly T[]): T[] {
  return bots.map(stripBotSecrets);
}
