import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PayoutRequest {
  id: string;
  userId: string;
  amount: number;
  method: string;
  destination: string;
  status: string;
  note: string;
  createdAt: string;
  processedAt: string | null;
  userName?: string;
}

export const PAYOUT_METHODS = ["paypal", "crypto", "bank"] as const;

export const myPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PayoutRequest[]> => {
    const { data, error } = await context.supabase
      .from("payout_requests")
      .select("id, user_id, amount, method, destination, status, note, created_at, processed_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      amount: r.amount,
      method: r.method,
      destination: r.destination,
      status: r.status,
      note: r.note,
      createdAt: r.created_at,
      processedAt: r.processed_at,
    }));
  });

export const requestPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        amount: z.number().int().min(1000).max(1_000_000),
        method: z.enum(PAYOUT_METHODS),
        destination: z.string().min(3).max(200),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("request_payout", {
      _user_id: context.userId,
      _amount: data.amount,
      _method: data.method,
      _destination: data.destination,
    });
    if (error) return { ok: false, error: "Could not submit the payout request." };
    return (result as { ok: boolean; error?: string }) ?? { ok: false, error: "Could not submit the payout request." };
  });

async function assertAdmin(supabase: { rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown }> }, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (data !== true) throw new Error("Forbidden");
}

export const adminListPayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PayoutRequest[]> => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("payout_requests")
      .select("id, user_id, amount, method, destination, status, note, created_at, processed_at")
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = data ?? [];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, display_name, username").in("id", ids)
      : { data: [] };
    const map = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? p.username ?? "Bottly user"]));
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      amount: r.amount,
      method: r.method,
      destination: r.destination,
      status: r.status,
      note: r.note,
      createdAt: r.created_at,
      processedAt: r.processed_at,
      userName: map.get(r.user_id) ?? "Bottly user",
    }));
  });

export const adminResolvePayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ id: z.string().uuid(), approve: z.boolean(), note: z.string().max(400).default("") })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("resolve_payout", {
      _admin_id: context.userId,
      _payout_id: data.id,
      _approve: data.approve,
      _note: data.note,
    });
    if (error) return { ok: false, error: "Could not update the payout." };
    return (result as { ok: boolean; error?: string }) ?? { ok: false, error: "Could not update the payout." };
  });
