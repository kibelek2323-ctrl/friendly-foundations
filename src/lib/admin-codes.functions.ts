import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PlanTier } from "./plan.functions";

export interface PlanCode {
  id: string;
  code: string;
  plan: PlanTier;
  durationDays: number | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return data === true;
  });

export const listPlanCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PlanCode[]> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("plan_codes")
      .select("id, code, plan, duration_days, max_uses, used_count, expires_at, active, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      code: r.code,
      plan: r.plan as PlanTier,
      durationDays: r.duration_days,
      maxUses: r.max_uses,
      usedCount: r.used_count,
      expiresAt: r.expires_at,
      active: r.active,
      createdAt: r.created_at,
    }));
  });

export const createPlanCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        plan: z.enum(["free", "pro", "ultimate"]),
        quantity: z.number().int().min(1).max(50),
        durationDays: z.number().int().min(1).max(3650).nullable(),
        maxUses: z.number().int().min(1).max(10000),
        expiresAt: z.string().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ codes: string[] }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) throw new Error("Forbidden");

    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const makeCode = () => {
      const bytes = crypto.getRandomValues(new Uint8Array(12));
      const raw = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
      return `${data.plan.slice(0, 3).toUpperCase()}-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    };

    const rows = Array.from({ length: data.quantity }, () => ({
      code: makeCode(),
      plan: data.plan,
      duration_days: data.durationDays,
      max_uses: data.maxUses,
      expires_at: data.expiresAt,
      created_by: context.userId,
    }));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("plan_codes").insert(rows);
    if (error) throw new Error(error.message);
    return { codes: rows.map((r) => r.code) };
  });

export const deactivatePlanCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("plan_codes").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export interface BalanceCode {
  id: string;
  code: string;
  amount: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export const listBalanceCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BalanceCode[]> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("balance_codes")
      .select("id, code, amount, max_uses, used_count, expires_at, active, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      code: r.code,
      amount: r.amount,
      maxUses: r.max_uses,
      usedCount: r.used_count,
      expiresAt: r.expires_at,
      active: r.active,
      createdAt: r.created_at,
    }));
  });

export const createBalanceCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        amount: z.number().int().min(1).max(1000000),
        quantity: z.number().int().min(1).max(50),
        maxUses: z.number().int().min(1).max(10000),
        expiresAt: z.string().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ codes: string[] }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) throw new Error("Forbidden");

    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const makeCode = () => {
      const bytes = crypto.getRandomValues(new Uint8Array(12));
      const raw = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
      return `CR-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
    };

    const rows = Array.from({ length: data.quantity }, () => ({
      code: makeCode(),
      amount: data.amount,
      max_uses: data.maxUses,
      expires_at: data.expiresAt,
      created_by: context.userId,
    }));

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("balance_codes").insert(rows);
    if (error) throw new Error(error.message);
    return { codes: rows.map((r) => r.code) };
  });

export const setBalanceCodeActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (isAdmin !== true) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("balance_codes").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Percentage discount codes (marketplace)                             */
/* ------------------------------------------------------------------ */

export interface DiscountCode {
  id: string;
  code: string;
  percent: number;
  listingId: string | null;
  listingTitle: string | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

async function assertAdmin(context: { supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> }; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("Forbidden");
}

export const listDiscountCodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DiscountCode[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("discount_codes")
      .select("id, code, percent, listing_id, max_uses, used_count, expires_at, active, created_at, marketplace_listings(title)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      code: r.code,
      percent: r.percent,
      listingId: r.listing_id,
      listingTitle: (r.marketplace_listings as { title?: string } | null)?.title ?? null,
      maxUses: r.max_uses,
      usedCount: r.used_count,
      expiresAt: r.expires_at,
      active: r.active,
      createdAt: r.created_at,
    }));
  });

export const createDiscountCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        percent: z.number().int().min(1).max(100),
        quantity: z.number().int().min(1).max(50),
        maxUses: z.number().int().min(1).max(10000),
        listingId: z.string().uuid().nullable().default(null),
        expiresAt: z.string().nullable().default(null),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ codes: string[] }> => {
    await assertAdmin(context);
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const makeCode = () => {
      const bytes = crypto.getRandomValues(new Uint8Array(8));
      const raw = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
      return `SAVE${data.percent}-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
    };
    const rows = Array.from({ length: data.quantity }, () => ({
      code: makeCode(),
      percent: data.percent,
      listing_id: data.listingId,
      max_uses: data.maxUses,
      expires_at: data.expiresAt,
      created_by: context.userId,
    }));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("discount_codes").insert(rows);
    if (error) throw new Error(error.message);
    return { codes: rows.map((r) => r.code) };
  });

export const setDiscountCodeActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("discount_codes").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* Creator verification                                                */
/* ------------------------------------------------------------------ */

export interface CreatorRow {
  id: string;
  displayName: string;
  username: string | null;
  verified: boolean;
  listingCount: number;
}

export const listCreators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CreatorRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: listings } = await supabaseAdmin.from("marketplace_listings").select("seller_id");
    const counts = new Map<string, number>();
    for (const l of listings ?? []) counts.set(l.seller_id, (counts.get(l.seller_id) ?? 0) + 1);
    const ids = Array.from(counts.keys());
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, username, verified")
      .or(ids.length ? `id.in.(${ids.join(",")}),verified.eq.true` : "verified.eq.true");
    return (profiles ?? []).map((p) => ({
      id: p.id,
      displayName: p.display_name ?? "Bottly creator",
      username: p.username ?? null,
      verified: p.verified ?? false,
      listingCount: counts.get(p.id) ?? 0,
    }));
  });

export const setCreatorVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid(), verified: z.boolean() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ verified: data.verified }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
