import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlanTier } from "./plan.functions";

export interface AdminUser {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  verified: boolean;
  banned: boolean;
  isAdmin: boolean;
  plan: PlanTier;
  balance: number;
  botCount: number;
  joinedAt: string;
}

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const supabase = context.supabase as {
    rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => Promise<{ data: unknown }>;
  };
  const { data } = await supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("Forbidden");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ search: z.string().max(120).default("") }).parse(data ?? {}))
  .handler(async ({ data, context }): Promise<AdminUser[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("profiles")
      .select("id, display_name, username, avatar_url, verified, banned, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    const term = data.search.trim();
    if (term) query = query.or(`display_name.ilike.%${term}%,username.ilike.%${term}%`);

    const { data: profiles, error } = await query;
    if (error) throw new Error(error.message);
    const rows = profiles ?? [];
    if (rows.length === 0) return [];
    const ids = rows.map((p) => p.id);

    const [{ data: plans }, { data: balances }, { data: roles }, { data: bots }] = await Promise.all([
      supabaseAdmin.from("user_plans").select("user_id, plan").in("user_id", ids),
      supabaseAdmin.from("user_balances").select("user_id, balance").in("user_id", ids),
      supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids),
      supabaseAdmin.from("bots").select("user_id").in("user_id", ids),
    ]);

    const planBy = new Map((plans ?? []).map((p) => [p.user_id, p.plan as PlanTier]));
    const balBy = new Map((balances ?? []).map((b) => [b.user_id, b.balance]));
    const adminIds = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    const botCount = new Map<string, number>();
    for (const b of bots ?? []) botCount.set(b.user_id, (botCount.get(b.user_id) ?? 0) + 1);

    return rows.map((p) => ({
      id: p.id,
      displayName: p.display_name ?? "Unnamed",
      username: p.username,
      avatarUrl: p.avatar_url,
      verified: p.verified,
      banned: p.banned,
      isAdmin: adminIds.has(p.id),
      plan: planBy.get(p.id) ?? "free",
      balance: balBy.get(p.id) ?? 0,
      botCount: botCount.get(p.id) ?? 0,
      joinedAt: p.created_at,
    }));
  });

export const setUserBanned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid(), banned: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ banned: data.banned }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    if (data.banned) {
      await supabaseAdmin.from("marketplace_listings").update({ published: false }).eq("seller_id", data.userId);
    }
    return { ok: true };
  });

export const setUserPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), plan: z.enum(["free", "pro", "ultimate"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_plans")
      .upsert({ user_id: data.userId, plan: data.plan, expires_at: null }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid(), admin: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.userId === context.userId && !data.admin) throw new Error("You cannot remove your own admin role.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.admin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const setUserVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid(), verified: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ verified: data.verified }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUserBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        badge: z.string().min(2).max(40),
        granted: z.boolean(),
        note: z.string().max(200).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.granted) {
      const { error } = await supabaseAdmin
        .from("profile_badges")
        .upsert(
          { user_id: data.userId, badge: data.badge, note: data.note, granted_by: context.userId },
          { onConflict: "user_id,badge" },
        );
      if (error) throw new Error(error.message);
      if (data.badge === "verified") {
        await supabaseAdmin.from("profiles").update({ verified: true }).eq("id", data.userId);
      }
    } else {
      const { error } = await supabaseAdmin
        .from("profile_badges")
        .delete()
        .eq("user_id", data.userId)
        .eq("badge", data.badge);
      if (error) throw new Error(error.message);
      if (data.badge === "verified") {
        await supabaseAdmin.from("profiles").update({ verified: false }).eq("id", data.userId);
      }
    }
    return { ok: true };
  });

export interface AdminUserDetail extends AdminUser {
  bio: string;
  email: string | null;
  badges: string[];
  listingCount: number;
  salesCount: number;
  adjustments: { id: string; amount: number; reason: string; createdAt: string }[];
}

export const getUserDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<AdminUserDetail | null> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = data.userId;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, username, bio, avatar_url, verified, banned, created_at")
      .eq("id", id)
      .maybeSingle();
    if (!profile) return null;

    const [{ data: plan }, { data: balance }, { data: roles }, { data: bots }, { data: listings }, { data: badges }, { data: adj }] =
      await Promise.all([
        supabaseAdmin.from("user_plans").select("plan").eq("user_id", id).maybeSingle(),
        supabaseAdmin.from("user_balances").select("balance").eq("user_id", id).maybeSingle(),
        supabaseAdmin.from("user_roles").select("role").eq("user_id", id),
        supabaseAdmin.from("bots").select("id").eq("user_id", id),
        supabaseAdmin.from("marketplace_listings").select("id, sales_count").eq("seller_id", id),
        supabaseAdmin.from("profile_badges").select("badge").eq("user_id", id),
        supabaseAdmin
          .from("balance_adjustments")
          .select("id, amount, reason, created_at")
          .eq("user_id", id)
          .order("created_at", { ascending: false })
          .limit(25),
      ]);

    let email: string | null = null;
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(id);
      email = authUser.user?.email ?? null;
    } catch {
      email = null;
    }

    return {
      id: profile.id,
      displayName: profile.display_name ?? "Unnamed",
      username: profile.username,
      bio: profile.bio ?? "",
      email,
      avatarUrl: profile.avatar_url,
      verified: profile.verified,
      banned: profile.banned,
      isAdmin: (roles ?? []).some((r) => r.role === "admin"),
      plan: (plan?.plan as PlanTier) ?? "free",
      balance: balance?.balance ?? 0,
      botCount: (bots ?? []).length,
      joinedAt: profile.created_at,
      badges: (badges ?? []).map((b) => b.badge),
      listingCount: (listings ?? []).length,
      salesCount: (listings ?? []).reduce((sum, l) => sum + (l.sales_count ?? 0), 0),
      adjustments: (adj ?? []).map((a) => ({
        id: a.id,
        amount: a.amount,
        reason: a.reason ?? "",
        createdAt: a.created_at,
      })),
    };
  });

/** Adjust a user's balance in cents (positive or negative). */
export const adjustUserBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        amount: z.number().int().min(-1_000_000).max(1_000_000),
        reason: z.string().max(200).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; balance?: number; error?: string }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: res, error } = await supabaseAdmin.rpc("admin_adjust_balance", {
      _admin_id: context.userId,
      _user_id: data.userId,
      _amount: data.amount,
      _reason: data.reason,
    });
    if (error) throw new Error(error.message);
    return (res ?? { ok: false }) as { ok: boolean; balance?: number; error?: string };
  });
