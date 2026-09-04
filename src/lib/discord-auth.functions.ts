import { createServerFn } from "@tanstack/react-start";
import { DISCORD_REDIRECT_URI } from "./discord-redirect";

/** Public: build the Discord authorize URL for sign-in. */
export const getDiscordLoginUrl = createServerFn({ method: "POST" })
  .handler(async () => {
    const clientId = process.env["DISCORD_CLIENT_ID"];
    if (!clientId) throw new Error("Discord login is not configured yet.");
    const redirectUri = DISCORD_REDIRECT_URI;
    const state = Buffer.from(JSON.stringify({ m: "login", n: crypto.randomUUID() })).toString("base64url");
    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "identify email");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "consent");
    return { url: url.toString() };
  });

/** Public: exchange the code, find/create the Bottly account, return a one-time session token. */
export const loginWithDiscord = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const clientId = process.env["DISCORD_CLIENT_ID"];
    const clientSecret = process.env["DISCORD_CLIENT_SECRET"];
    if (!clientId || !clientSecret) throw new Error("Discord login is not configured yet.");
    const redirectUri = DISCORD_REDIRECT_URI;
    const discordApi = "https://discord.com/api/v10";

    const tokenRes = await fetch(`${discordApi}/oauth2/token`, {
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
      throw new Error(`Discord token exchange failed: ${tokenRes.status}`);
    }
    const tokenData = (await tokenRes.json()) as { access_token: string };

    const userRes = await fetch(`${discordApi}/users/@me`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) throw new Error("Could not fetch your Discord profile");
    const du = (await userRes.json()) as {
      id: string;
      username: string;
      global_name: string | null;
      avatar: string | null;
      email: string | null;
      verified?: boolean;
    };

    if (!du.email) {
      throw new Error("Your Discord account has no email address available. Grant the email permission and retry.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = du.email.toLowerCase();
    const displayName = du.global_name ?? du.username;
    const avatarUrl = du.avatar ? `https://cdn.discordapp.com/avatars/${du.id}/${du.avatar}.png` : null;

    // Find an existing account with this email.
    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listError) throw listError;
    let existing = list.users.find((u) => (u.email ?? "").toLowerCase() === email);

    if (!existing) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: displayName,
          avatar_url: avatarUrl,
          discord_id: du.id,
          discord_username: du.username,
        },
      });
      if (createError) throw createError;
      existing = created.user;
    } else {
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        user_metadata: {
          ...(existing.user_metadata ?? {}),
          full_name: existing.user_metadata?.["full_name"] ?? displayName,
          avatar_url: existing.user_metadata?.["avatar_url"] ?? avatarUrl,
          discord_id: du.id,
          discord_username: du.username,
        },
      });
    }

    // Sync the Discord avatar onto the public profile. Only fill an empty
    // avatar or refresh one that already came from Discord — never overwrite
    // a custom uploaded picture.
    if (avatarUrl) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("avatar_url")
        .eq("id", existing.id)
        .maybeSingle();
      const current = profile?.avatar_url ?? null;
      if (!current || current.includes("cdn.discordapp.com")) {
        await supabaseAdmin
          .from("profiles")
          .update({ avatar_url: avatarUrl })
          .eq("id", existing.id);
      }
    }

    const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkError) throw linkError;

    return {
      email,
      username: displayName,
      tokenHash: link.properties.hashed_token,
    };
  });
