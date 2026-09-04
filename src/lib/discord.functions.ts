import { DISCORD_REDIRECT_URI } from "./discord-redirect";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DISCORD_API = "https://discord.com/api/v10";

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
}

function getClientCreds() {
  const clientId = process.env['DISCORD_CLIENT_ID'];
  const clientSecret = process.env['DISCORD_CLIENT_SECRET'];
  if (!clientId || !clientSecret) {
    throw new Error("Discord OAuth is not configured. Add DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET secrets.");
  }
  return { clientId, clientSecret };
}

export const getDiscordAuthUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { clientId } = getClientCreds();
    const state = Buffer.from(JSON.stringify({ u: context.userId })).toString("base64url");
    const redirectUri = DISCORD_REDIRECT_URI;
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "identify guilds");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "consent");
    return { url: url.toString(), state };
  });

export const exchangeDiscordCode = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; state: string }) => data)
  .handler(async ({ data }) => {
    const { clientId, clientSecret } = getClientCreds();
    const redirectUri = DISCORD_REDIRECT_URI;

    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: data.code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new Error(`Discord token exchange failed: ${tokenRes.status} ${text}`);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope: string;
    };

    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      throw new Error("Could not fetch Discord user profile");
    }

    const user = (await userRes.json()) as DiscordUser;

    const statePayload = JSON.parse(Buffer.from(data.state, "base64url").toString()) as { u: string };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    const { error } = await supabaseAdmin.from("discord_connections").upsert(
      {
        user_id: statePayload.u,
        discord_user_id: user.id,
        username: user.username,
        discriminator: user.discriminator,
        avatar_url: user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
          : null,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token ?? null,
        scopes: tokenData.scope.split(" "),
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) throw error;

    // Sync the Discord avatar to the user's profile picture.
    // Set it when the profile has no avatar yet, or when the current one
    // already came from Discord (so re-connects refresh it) — never
    // overwrite a custom avatar the user uploaded.
    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
      : null;
    if (avatarUrl) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("avatar_url")
        .eq("id", statePayload.u)
        .maybeSingle();
      const current = profile?.avatar_url ?? null;
      if (!current || current.includes("cdn.discordapp.com")) {
        await supabaseAdmin
          .from("profiles")
          .update({ avatar_url: avatarUrl })
          .eq("id", statePayload.u);
      }
    }

    return { ok: true, username: user.username };
  });

export const getDiscordConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("discord_connections")
      .select("id, discord_user_id, username, discriminator, avatar_url, scopes, expires_at, created_at, updated_at")
      .eq("user_id", context.userId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return { connection: data };
  });

export const disconnectDiscord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.from("discord_connections").delete().eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const listUserGuilds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: conn } = await context.supabase
      .from("discord_connections")
      .select("access_token")
      .eq("user_id", context.userId)
      .single();

    if (!conn) return { guilds: [] as DiscordGuild[] };

    const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${conn.access_token}` },
    });

    if (!res.ok) throw new Error("Could not fetch Discord servers");
    const guilds = (await res.json()) as DiscordGuild[];
    return { guilds };
  });

export const listGuildChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { guildId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: conn } = await context.supabase
      .from("discord_connections")
      .select("access_token")
      .eq("user_id", context.userId)
      .single();

    if (!conn) return { channels: [] as DiscordChannel[] };

    const res = await fetch(`${DISCORD_API}/guilds/${data.guildId}/channels`, {
      headers: { Authorization: `Bearer ${conn.access_token}` },
    });

    if (!res.ok) throw new Error("Could not fetch Discord channels");
    const channels = (await res.json()) as DiscordChannel[];
    return { channels: channels.filter((c) => [0, 2, 4, 5, 13, 15, 16].includes(c.type)) };
  });

export const listGuildRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { guildId: string }) => data)
  .handler(async ({ data, context }) => {
    const { data: conn } = await context.supabase
      .from("discord_connections")
      .select("access_token")
      .eq("user_id", context.userId)
      .single();

    if (!conn) return { roles: [] as DiscordRole[] };

    const res = await fetch(`${DISCORD_API}/guilds/${data.guildId}/roles`, {
      headers: { Authorization: `Bearer ${conn.access_token}` },
    });

    if (!res.ok) throw new Error("Could not fetch Discord roles");
    const roles = (await res.json()) as DiscordRole[];
    return { roles: roles.sort((a, b) => b.position - a.position) };
  });
