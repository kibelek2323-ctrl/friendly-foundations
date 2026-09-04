import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ReferralSettings {
  referrerBonus: number;
  refereeBonus: number;
  minSpend: number;
}

export interface ReferralEntry {
  id: string;
  name: string;
  status: string;
  rewardAmount: number;
  createdAt: string;
}

export interface MyReferralOverview {
  code: string;
  clicks: number;
  settings: ReferralSettings;
  invited: ReferralEntry[];
  earned: number;
  usedCode: string | null;
}

const DEFAULT_SETTINGS: ReferralSettings = { referrerBonus: 200, refereeBonus: 100, minSpend: 100 };

function makeCode(seed: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = crypto.getRandomValues(new Uint32Array(6));
  return `${seed.slice(0, 2).toUpperCase()}${Array.from(values, (v) => alphabet[v % alphabet.length]).join("")}`;
}

async function readSettings(): Promise<ReferralSettings> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("app_settings").select("value").eq("key", "referral").maybeSingle();
  const value = (data?.value ?? {}) as Partial<ReferralSettings>;
  return {
    referrerBonus: value.referrerBonus ?? DEFAULT_SETTINGS.referrerBonus,
    refereeBonus: value.refereeBonus ?? DEFAULT_SETTINGS.refereeBonus,
    minSpend: value.minSpend ?? DEFAULT_SETTINGS.minSpend,
  };
}

/** Public settings, used on the sign-up page to advertise the bonus. */
export const getReferralSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<ReferralSettings> => readSettings(),
);

export const getMyReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyReferralOverview> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let { data: codeRow } = await supabaseAdmin
      .from("referral_codes")
      .select("code, clicks")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!codeRow) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("username, display_name")
        .eq("id", context.userId)
        .maybeSingle();
      const seed = (profile?.username ?? profile?.display_name ?? "bt").replace(/[^a-zA-Z]/g, "") || "BT";
      const { data: created } = await supabaseAdmin
        .from("referral_codes")
        .insert({ user_id: context.userId, code: makeCode(seed) })
        .select("code, clicks")
        .single();
      codeRow = created ?? { code: makeCode(seed), clicks: 0 };
    }

    const [{ data: invited }, { data: mine }, settings] = await Promise.all([
      supabaseAdmin
        .from("referrals")
        .select("id, referred_id, status, reward_amount, created_at")
        .eq("referrer_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin.from("referrals").select("code").eq("referred_id", context.userId).maybeSingle(),
      readSettings(),
    ]);

    const rows = invited ?? [];
    const ids = rows.map((r) => r.referred_id);
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, display_name, username").in("id", ids)
      : { data: [] };
    const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? p.username ?? "Bottly user"]));

    return {
      code: codeRow.code,
      clicks: codeRow.clicks ?? 0,
      settings,
      usedCode: mine?.code ?? null,
      earned: rows.reduce((sum, r) => sum + (r.reward_amount ?? 0), 0),
      invited: rows.map((r) => ({
        id: r.id,
        name: nameMap.get(r.referred_id) ?? "Bottly user",
        status: r.status,
        rewardAmount: r.reward_amount ?? 0,
        createdAt: r.created_at,
      })),
    };
  });

/** Records a referral click so creators can see how their link performs. */
export const trackReferralClick = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ code: z.string().min(3).max(32) }).parse(data))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("referral_codes")
      .select("user_id, clicks")
      .ilike("code", data.code)
      .maybeSingle();
    if (row) {
      await supabaseAdmin
        .from("referral_codes")
        .update({ clicks: (row.clicks ?? 0) + 1 })
        .eq("user_id", row.user_id);
    }
    return { ok: true };
  });

/** Links the signed-in account to the person who invited them. */
export const applyReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ code: z.string().min(3).max(32) }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string; bonus?: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("attach_referral", {
      _user_id: context.userId,
      _code: data.code,
    });
    if (error) return { ok: false, error: "Could not apply that referral code." };
    return (result as { ok: boolean; error?: string; bonus?: number }) ?? { ok: false, error: "Invalid code." };
  });

/** Lets a creator pick their own memorable referral code. */
export const setMyReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ code: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_-]+$/) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string; code?: string }> => {
    const code = data.code.toUpperCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: taken } = await supabaseAdmin
      .from("referral_codes")
      .select("user_id")
      .ilike("code", code)
      .maybeSingle();
    if (taken && taken.user_id !== context.userId) return { ok: false, error: "That code is already taken." };

    const { error } = await supabaseAdmin
      .from("referral_codes")
      .upsert({ user_id: context.userId, code }, { onConflict: "user_id" });
    if (error) return { ok: false, error: "Could not save that code." };
    return { ok: true, code };
  });

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export interface AdminReferralRow extends ReferralEntry {
  referrerName: string;
}

export const adminGetReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ settings: ReferralSettings; rows: AdminReferralRow[] }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (isAdmin !== true) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: rows }, settings] = await Promise.all([
      supabaseAdmin
        .from("referrals")
        .select("id, referrer_id, referred_id, status, reward_amount, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      readSettings(),
    ]);
    const list = rows ?? [];
    const ids = Array.from(new Set(list.flatMap((r) => [r.referrer_id, r.referred_id])));
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, display_name, username").in("id", ids)
      : { data: [] };
    const map = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? p.username ?? "Bottly user"]));
    return {
      settings,
      rows: list.map((r) => ({
        id: r.id,
        name: map.get(r.referred_id) ?? "Bottly user",
        referrerName: map.get(r.referrer_id) ?? "Bottly user",
        status: r.status,
        rewardAmount: r.reward_amount ?? 0,
        createdAt: r.created_at,
      })),
    };
  });

export const adminSaveReferralSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        referrerBonus: z.number().int().min(0).max(100_000),
        refereeBonus: z.number().int().min(0).max(100_000),
        minSpend: z.number().int().min(0).max(100_000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (isAdmin !== true) return { ok: false, error: "Forbidden" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "referral", value: data, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) return { ok: false, error: "Could not save the referral settings." };
    return { ok: true };
  });
