import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEVELOPER_BADGE } from "@/lib/roles.functions";

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface DeveloperApplication {
  id: string;
  userId: string;
  applicantName: string | null;
  experience: string;
  aiUsage: string;
  portfolioUrl: string;
  githubUrl: string;
  motivation: string;
  status: ApplicationStatus;
  adminNote: string;
  createdAt: string;
}

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), { message: "Must be a valid http(s) link" });

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const supabase = context.supabase as {
    rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => Promise<{ data: unknown }>;
  };
  const { data } = await supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("Forbidden");
}

/** Current user's latest application, if any. */
export const myDeveloperApplication = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeveloperApplication | null> => {
    const { data, error } = await context.supabase
      .from("developer_applications")
      .select("id, user_id, experience, ai_usage, portfolio_url, github_url, motivation, status, admin_note, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      id: data.id,
      userId: data.user_id,
      applicantName: null,
      experience: data.experience,
      aiUsage: data.ai_usage,
      portfolioUrl: data.portfolio_url,
      githubUrl: data.github_url,
      motivation: data.motivation,
      status: data.status as ApplicationStatus,
      adminNote: data.admin_note,
      createdAt: data.created_at,
    };
  });

export const submitDeveloperApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        experience: z.string().trim().min(20, "Tell us a bit more").max(2000),
        aiUsage: z.string().trim().min(5).max(1000),
        portfolioUrl: optionalUrl.default(""),
        githubUrl: optionalUrl.default(""),
        motivation: z.string().trim().min(20, "Tell us a bit more").max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("developer_applications").insert({
      user_id: context.userId,
      experience: data.experience,
      ai_usage: data.aiUsage,
      portfolio_url: data.portfolioUrl,
      github_url: data.githubUrl,
      motivation: data.motivation,
      status: "pending",
    });
    if (error) {
      if (error.code === "23505") throw new Error("You already have a pending application");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const listDeveloperApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ status: z.enum(["pending", "approved", "rejected", "all"]).default("pending") }).parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<DeveloperApplication[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("developer_applications")
      .select("id, user_id, experience, ai_usage, portfolio_url, github_url, motivation, status, admin_note, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") query = query.eq("status", data.status);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const list = rows ?? [];

    const ids = [...new Set(list.map((r) => r.user_id))];
    const names = new Map<string, string | null>();
    if (ids.length) {
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id, display_name, username").in("id", ids);
      for (const p of profiles ?? []) names.set(p.id, p.display_name ?? p.username ?? null);
    }

    return list.map((r) => ({
      id: r.id,
      userId: r.user_id,
      applicantName: names.get(r.user_id) ?? null,
      experience: r.experience,
      aiUsage: r.ai_usage,
      portfolioUrl: r.portfolio_url,
      githubUrl: r.github_url,
      motivation: r.motivation,
      status: r.status as ApplicationStatus,
      adminNote: r.admin_note,
      createdAt: r.created_at,
    }));
  });

/** Approve (grants the developer badge) or reject an application. */
export const reviewDeveloperApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        approve: z.boolean(),
        note: z.string().trim().max(500).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error: readErr } = await supabaseAdmin
      .from("developer_applications")
      .select("id, user_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!row) throw new Error("Application not found");

    const status: ApplicationStatus = data.approve ? "approved" : "rejected";
    const { error } = await supabaseAdmin
      .from("developer_applications")
      .update({
        status,
        admin_note: data.note,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.approve) {
      const { data: existing } = await supabaseAdmin
        .from("profile_badges")
        .select("id")
        .eq("user_id", row.user_id)
        .eq("badge", DEVELOPER_BADGE)
        .maybeSingle();
      if (!existing) {
        await supabaseAdmin.from("profile_badges").insert({
          user_id: row.user_id,
          badge: DEVELOPER_BADGE,
          note: data.note || "Developer application approved",
          granted_by: context.userId,
        });
      }
    }

    await supabaseAdmin.from("user_notifications").insert({
      user_id: row.user_id,
      kind: "system",
      title: data.approve ? "You are now a Bottly developer" : "Developer application declined",
      body: data.approve
        ? "Your developer application was approved. You can publish on the marketplace and request payouts."
        : data.note || "Your developer application was not approved this time.",
      href: data.approve ? "/marketplace/publish" : "/developer",
    });

    return { ok: true, status };
  });
