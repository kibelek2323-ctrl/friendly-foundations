import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Account rank granting marketplace publishing and earnings access. */
export const DEVELOPER_BADGE = "developer";

export interface AccountRank {
  developer: boolean;
  admin: boolean;
}

/** True when the user may publish on the marketplace and request payouts. */
export async function hasDeveloperAccess(context: {
  supabase: {
    rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => Promise<{ data: unknown }>;
    from: (t: "profile_badges") => {
      select: (c: string) => {
        eq: (c: string, v: string) => {
          eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> };
        };
      };
    };
  };
  userId: string;
}): Promise<boolean> {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (isAdmin === true) return true;
  const { data: badge } = await context.supabase
    .from("profile_badges")
    .select("badge")
    .eq("user_id", context.userId)
    .eq("badge", DEVELOPER_BADGE)
    .maybeSingle();
  return badge != null;
}

/** Rank of the signed-in account, used to gate creator-only screens. */
export const myAccountRank = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AccountRank> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { data: badge } = await context.supabase
      .from("profile_badges")
      .select("badge")
      .eq("user_id", context.userId)
      .eq("badge", DEVELOPER_BADGE)
      .maybeSingle();
    return { admin: isAdmin === true, developer: isAdmin === true || badge != null };
  });
