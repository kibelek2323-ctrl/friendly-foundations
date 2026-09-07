/**
 * Server-only encryption for Discord OAuth tokens stored in
 * `public.discord_connections`.
 *
 * Reuses the AES-256-GCM helpers behind BOT_TOKEN_ENCRYPTION_KEY. Rows written
 * before this change have no `token_iv` and are treated as legacy plaintext so
 * existing connections keep working until they are re-linked.
 */
import { encryptBotToken, decryptBotToken, BOT_TOKEN_KEY_VERSION } from "./bot-token-crypto.server";

export interface EncryptedPair {
  access_token: string;
  token_iv: string;
  refresh_token: string | null;
  refresh_iv: string | null;
  key_version: number;
}

export async function encryptDiscordTokens(
  accessToken: string,
  refreshToken: string | null,
): Promise<EncryptedPair> {
  const access = await encryptBotToken(accessToken);
  const refresh = refreshToken ? await encryptBotToken(refreshToken) : null;
  return {
    access_token: access.ciphertext,
    token_iv: access.iv,
    refresh_token: refresh?.ciphertext ?? null,
    refresh_iv: refresh?.iv ?? null,
    key_version: BOT_TOKEN_KEY_VERSION,
  };
}

/** Returns the usable Discord access token for a user, or null. */
export async function readDiscordAccessToken(userId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("discord_connections")
    .select("access_token, token_iv, key_version")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.access_token) return null;
  if (!data.token_iv) return data.access_token; // legacy plaintext row
  return decryptBotToken({
    ciphertext: data.access_token,
    iv: data.token_iv,
    keyVersion: data.key_version ?? BOT_TOKEN_KEY_VERSION,
  });
}
