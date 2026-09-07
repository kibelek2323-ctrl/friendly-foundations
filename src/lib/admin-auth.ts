/**
 * Single, server-only source of truth for administrator authorization.
 *
 * The role lives in the `user_roles` table (never on the profile, never in the
 * client). It is read through the `has_role` SECURITY DEFINER database
 * function using the caller's *validated* bearer token, so nothing the browser
 * sends — request bodies, URL params, localStorage, cookies or the maintenance
 * unlock cookie — can influence the answer.
 */

export interface AuthedContext {
  supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> };
  userId: string;
}

/** True only when the authenticated caller holds the `admin` role. */
export async function isAdmin(context: AuthedContext): Promise<boolean> {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  return data === true;
}

/** Throws `Forbidden` unless the authenticated caller is an administrator. */
export async function assertAdmin(context: AuthedContext): Promise<void> {
  if (!(await isAdmin(context))) throw new Error("Forbidden");
}
