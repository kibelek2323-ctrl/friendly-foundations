/**
 * Server-only helpers for the two-factor session gate.
 *
 * A Supabase JWT alone is NOT enough to use the app when the account has email
 * two-factor turned on: the session id embedded in the token must also appear
 * in `public.two_factor_sessions`, which only this server can write (after a
 * valid code was consumed).
 */

export interface TokenIdentity {
  userId: string;
  sessionId: string | null;
}

/** Reads sub/session_id out of a JWT payload without verifying it. */
export function readTokenIdentity(token: string): TokenIdentity | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const normalized = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { sub?: string; session_id?: string };
    if (!payload.sub) return null;
    return { userId: payload.sub, sessionId: payload.session_id ?? null };
  } catch {
    return null;
  }
}

export async function twoFactorEnabled(userId: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_2fa")
    .select("email_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.email_enabled === true;
}

export async function sessionVerified(userId: string, sessionId: string | null): Promise<boolean> {
  if (!sessionId) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("two_factor_sessions")
    .select("session_id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function markSessionVerified(userId: string, sessionId: string | null): Promise<void> {
  if (!sessionId) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("two_factor_sessions")
    .upsert({ session_id: sessionId, user_id: userId, verified_at: new Date().toISOString() }, {
      onConflict: "session_id",
    });
}

/** True when this token must complete a two-factor code before it may be used. */
export async function tokenNeedsTwoFactor(token: string): Promise<boolean> {
  const identity = readTokenIdentity(token);
  if (!identity) return false;
  if (!(await twoFactorEnabled(identity.userId))) return false;
  return !(await sessionVerified(identity.userId, identity.sessionId));
}
