import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PlanTier = "free" | "pro" | "ultimate";

export interface MyPlan {
  plan: PlanTier;
  expiresAt: string | null;
  aiUsedToday: number;
  botCount: number;
}

export const getMyPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyPlan> => {
    const { supabase, userId } = context;

    const [{ data: planRow }, { data: usage }, { count }] = await Promise.all([
      supabase.from("user_plans").select("plan, expires_at").eq("user_id", userId).maybeSingle(),
      supabase
        .from("ai_usage")
        .select("count")
        .eq("user_id", userId)
        .eq("day", new Date().toISOString().slice(0, 10))
        .maybeSingle(),
      supabase.from("bots").select("id", { count: "exact", head: true }).eq("user_id", userId),
    ]);

    const expiresAt = planRow?.expires_at ?? null;
    const expired = expiresAt !== null && new Date(expiresAt).getTime() < Date.now();
    const plan: PlanTier = expired ? "free" : ((planRow?.plan as PlanTier | undefined) ?? "free");

    return {
      plan,
      expiresAt: expired ? null : expiresAt,
      aiUsedToday: usage?.count ?? 0,
      botCount: count ?? 0,
    };
  });

export const redeemPlanCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ code: z.string().min(3).max(64) }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string; plan?: PlanTier }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("redeem_plan_code", {
      _user_id: context.userId,
      _code: data.code,
    });
    if (error) return { ok: false, error: "Could not redeem that code. Please try again." };
    const parsed = result as { ok: boolean; error?: string; plan?: PlanTier } | null;
    return parsed ?? { ok: false, error: "Invalid code." };
  });
