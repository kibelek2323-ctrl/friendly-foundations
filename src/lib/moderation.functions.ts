import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReportTarget = "listing" | "user" | "review";
export type ReportStatus = "open" | "resolved" | "dismissed";

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterName: string | null;
  targetType: ReportTarget;
  targetId: string;
  targetTitle: string | null;
  reason: string;
  details: string;
  status: ReportStatus;
  resolutionNote: string | null;
  createdAt: string;
}

export const REPORT_REASONS = [
  "Spam or misleading",
  "Malicious or harmful bot",
  "Stolen content",
  "Inappropriate content",
  "Other",
] as const;

async function assertAdmin(context: { supabase: { rpc: (fn: never, args: never) => Promise<{ data: unknown }> }; userId: string }) {
  const rpc = context.supabase.rpc as unknown as (
    fn: "has_role",
    args: { _user_id: string; _role: "admin" },
  ) => Promise<{ data: unknown }>;
  const { data } = await rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("Forbidden");
}

export const submitReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        targetType: z.enum(["listing", "user", "review"]),
        targetId: z.string().min(1).max(128),
        reason: z.string().min(2).max(120),
        details: z.string().max(2000).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("reports").insert({
      reporter_id: context.userId,
      target_type: data.targetType,
      target_id: data.targetId,
      reason: data.reason,
      details: data.details,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ status: z.enum(["open", "resolved", "dismissed", "all"]).default("open") }).parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<ReportItem[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("reports")
      .select("id, reporter_id, target_type, target_id, reason, details, status, resolution_note, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    if (list.length === 0) return [];

    const reporterIds = [...new Set(list.map((r) => r.reporter_id))];
    const listingIds = [...new Set(list.filter((r) => r.target_type === "listing").map((r) => r.target_id))];

    const [{ data: profiles }, { data: listings }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, display_name").in("id", reporterIds),
      listingIds.length
        ? supabaseAdmin.from("marketplace_listings").select("id, title").in("id", listingIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    ]);

    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
    const titleById = new Map((listings ?? []).map((l) => [l.id, l.title]));

    return list.map((r) => ({
      id: r.id,
      reporterId: r.reporter_id,
      reporterName: nameById.get(r.reporter_id) ?? null,
      targetType: r.target_type as ReportTarget,
      targetId: r.target_id,
      targetTitle: r.target_type === "listing" ? (titleById.get(r.target_id) ?? null) : null,
      reason: r.reason,
      details: r.details,
      status: r.status as ReportStatus,
      resolutionNote: r.resolution_note,
      createdAt: r.created_at,
    }));
  });

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["open", "resolved", "dismissed"]),
        note: z.string().max(1000).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("reports")
      .update({
        status: data.status,
        resolution_note: data.note || null,
        resolved_by: context.userId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: hide or restore a marketplace listing flagged by moderation. */
export const setListingPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ listingId: z.string().uuid(), published: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("marketplace_listings")
      .update({ published: data.published })
      .eq("id", data.listingId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
