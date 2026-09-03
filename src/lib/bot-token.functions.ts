import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DISCORD_API = "https://discord.com/api/v10";

/**
 * Everything the browser is allowed to know about a stored token.
 * Deliberately contains no ciphertext, no nonce and no token material.
 */
export interface BotTokenStatus {
  hasToken: boolean;
  applicationId: string | null;
  verifiedAt: string | null;
  updatedAt: string | null;
}

export interface SetBotTokenResult {
  ok: boolean;
  error?: string;
  status?: BotTokenStatus;
  /**
   * Bot account name reported by Discord, so the UI can confirm the right app.
   * Explicitly `| undefined` because the project runs exactOptionalPropertyTypes.
   */
  discordUsername?: string | undefined;
}

const NO_TOKEN: BotTokenStatus = {
  hasToken: false,
  applicationId: null,
  verifiedAt: null,
  updatedAt: null,
};

const botIdInput = z.object({ botId: z.string().min(1).max(64) });

export const getBotTokenStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => botIdInput.parse(data))
  .handler(async ({ data, context }): Promise<BotTokenStatus> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("bot_tokens")
      .select("application_id, verified_at, updated_at")
      .eq("user_id", context.userId)
      .eq("bot_id", data.botId)
      .maybeSingle();

    if (!row) return NO_TOKEN;

    return {
      hasToken: true,
      applicationId: row.application_id,
      verifiedAt: row.verified_at,
      updatedAt: row.updated_at,
    };
  });

export const setBotToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        botId: z.string().min(1).max(64),
        botName: z.string().min(1).max(120).optional(),
        token: z.string().min(20).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<SetBotTokenResult> => {
    const token = data.token.trim();

    const { looksLikeDiscordBotToken } = await import("@/lib/discord-token");
    if (!looksLikeDiscordBotToken(token)) {
      return {
        ok: false,
        error:
          "That does not look like a bot token. Copy it from the Bot tab of your application in the Discord developer portal.",
      };
    }

    // Verify against Discord for real. A token that cannot log in is never stored
    // and never reported as saved.
    let identity: { id?: string; username?: string; bot?: boolean };
    try {
      const response = await fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bot ${token}` },
      });

      if (response.status === 401) {
        return {
          ok: false,
          error: "Discord rejected this token. It may have been reset, or copied incompletely.",
        };
      }
      if (response.status === 429) {
        return { ok: false, error: "Discord is rate limiting this check. Try again in a moment." };
      }
      if (!response.ok) {
        return {
          ok: false,
          error: `Discord returned ${response.status} while verifying the token.`,
        };
      }

      identity = (await response.json()) as { id?: string; username?: string; bot?: boolean };
    } catch {
      return { ok: false, error: "Could not reach Discord to verify the token. Try again." };
    }

    if (!identity.id) {
      return { ok: false, error: "Discord did not return an application id for this token." };
    }
    if (identity.bot !== true) {
      return {
        ok: false,
        error: "That token belongs to a user account, not a bot application. Use the bot token.",
      };
    }

    // bot_tokens is FK'd to public.bots, and a freshly created bot may not have
    // been synced yet. This runs on the RLS-scoped client, so it can only ever
    // touch the caller's own row.
    const { error: botRowError } = await context.supabase.from("bots").upsert(
      {
        id: data.botId,
        user_id: context.userId,
        ...(data.botName ? { name: data.botName } : {}),
      },
      { onConflict: "user_id,id" },
    );
    if (botRowError) {
      return { ok: false, error: "Could not link the token to this bot. Reload and try again." };
    }

    const { encryptBotToken } = await import("@/lib/bot-token-crypto.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let sealed: Awaited<ReturnType<typeof encryptBotToken>>;
    try {
      sealed = await encryptBotToken(token);
    } catch (error) {
      // Misconfigured encryption key — log server-side, stay vague to the client.
      console.error("[bot-token] encryption failed", error);
      return { ok: false, error: "Token storage is not configured on the server." };
    }

    const verifiedAt = new Date().toISOString();
    const { error } = await supabaseAdmin.from("bot_tokens").upsert(
      {
        bot_id: data.botId,
        user_id: context.userId,
        ciphertext: sealed.ciphertext,
        iv: sealed.iv,
        key_version: sealed.keyVersion,
        application_id: identity.id,
        verified_at: verifiedAt,
      },
      { onConflict: "user_id,bot_id" },
    );

    if (error) {
      console.error("[bot-token] upsert failed", error);
      return { ok: false, error: "Could not store the token. Try again." };
    }

    return {
      ok: true,
      discordUsername: identity.username,
      status: {
        hasToken: true,
        applicationId: identity.id,
        verifiedAt,
        updatedAt: verifiedAt,
      },
    };
  });

export const deleteBotToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => botIdInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("bot_tokens")
      .delete()
      .eq("user_id", context.userId)
      .eq("bot_id", data.botId);

    if (error) {
      console.error("[bot-token] delete failed", error);
      return { ok: false, error: "Could not remove the token. Try again." };
    }
    return { ok: true };
  });
