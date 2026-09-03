import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AdminStats {
  totals: {
    users: number;
    bots: number;
    listings: number;
    purchases: number;
    revenue: number;
    openReports: number;
  };
  signupsByDay: { day: string; count: number }[];
  botsByDay: { day: string; count: number }[];
  salesByDay: { day: string; count: number; revenue: number }[];
  planBreakdown: { plan: string; count: number }[];
}

const DAYS = 30;

function emptySeries(): Map<string, number> {
  const map = new Map<string, number>();
  const today = new Date();
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    map.set(d.toISOString().slice(0, 10), 0);
  }
  return map;
}

function bucket(rows: { created_at: string }[]): { day: string; count: number }[] {
  const series = emptySeries();
  for (const r of rows) {
    const key = r.created_at.slice(0, 10);
    if (series.has(key)) series.set(key, (series.get(key) ?? 0) + 1);
  }
  return [...series].map(([day, count]) => ({ day, count }));
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminStats> => {
    const supabase = context.supabase as unknown as {
      rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => Promise<{ data: unknown }>;
    };
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (isAdmin !== true) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();

    const [profiles, bots, listings, purchases, reports, plans, recentProfiles, recentBots] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("bots").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("marketplace_listings").select("id", { count: "exact", head: true }).eq("published", true),
      supabaseAdmin.from("marketplace_purchases").select("price, created_at"),
      supabaseAdmin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabaseAdmin.from("user_plans").select("plan"),
      supabaseAdmin.from("profiles").select("created_at").gte("created_at", since),
      supabaseAdmin.from("bots").select("created_at").gte("created_at", since),
    ]);

    const purchaseRows = purchases.data ?? [];
    const revenue = purchaseRows.reduce((sum, p) => sum + (p.price ?? 0), 0);

    const salesSeries = emptySeries();
    const revenueSeries = emptySeries();
    for (const p of purchaseRows) {
      const key = p.created_at.slice(0, 10);
      if (!salesSeries.has(key)) continue;
      salesSeries.set(key, (salesSeries.get(key) ?? 0) + 1);
      revenueSeries.set(key, (revenueSeries.get(key) ?? 0) + (p.price ?? 0));
    }

    const planCounts = new Map<string, number>([
      ["free", 0],
      ["pro", 0],
      ["ultimate", 0],
    ]);
    for (const p of plans.data ?? []) planCounts.set(p.plan, (planCounts.get(p.plan) ?? 0) + 1);
    const freeUsers = (profiles.count ?? 0) - (plans.data ?? []).length;
    planCounts.set("free", (planCounts.get("free") ?? 0) + Math.max(freeUsers, 0));

    return {
      totals: {
        users: profiles.count ?? 0,
        bots: bots.count ?? 0,
        listings: listings.count ?? 0,
        purchases: purchaseRows.length,
        revenue,
        openReports: reports.count ?? 0,
      },
      signupsByDay: bucket(recentProfiles.data ?? []),
      botsByDay: bucket(recentBots.data ?? []),
      salesByDay: [...salesSeries].map(([day, count]) => ({
        day,
        count,
        revenue: revenueSeries.get(day) ?? 0,
      })),
      planBreakdown: [...planCounts].map(([plan, count]) => ({ plan, count })),
    };
  });
