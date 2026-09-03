import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type AnnouncementKind = "popup" | "bar";
export type AnnouncementVariant = "info" | "success" | "warning" | "promo";

export interface Announcement {
  id: string;
  kind: AnnouncementKind;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  variant: AnnouncementVariant;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
}

type Row = {
  id: string;
  kind: string;
  title: string;
  body: string;
  cta_label: string | null;
  cta_url: string | null;
  variant: string;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

const SELECT = "id, kind, title, body, cta_label, cta_url, variant, active, starts_at, ends_at, created_at";

function toAnnouncement(r: Row): Announcement {
  return {
    id: r.id,
    kind: r.kind as AnnouncementKind,
    title: r.title,
    body: r.body,
    ctaLabel: r.cta_label,
    ctaUrl: r.cta_url,
    variant: r.variant as AnnouncementVariant,
    active: r.active,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    createdAt: r.created_at,
  };
}

/** Public: currently active announcements (RLS filters by schedule). */
export const listActiveAnnouncements = createServerFn({ method: "GET" }).handler(async (): Promise<Announcement[]> => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const supabasePublic = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data } = await supabasePublic
    .from("site_announcements")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(20);
  return ((data ?? []) as Row[]).map(toAnnouncement);
});

async function assertAdmin(context: { supabase: { rpc: (fn: string, args: unknown) => Promise<{ data: unknown }> }; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("Forbidden");
}

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Announcement[]> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("site_announcements")
      .select(SELECT)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(toAnnouncement);
  });

const upsertSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  kind: z.enum(["popup", "bar"]),
  title: z.string().max(160).default(""),
  body: z.string().max(2000).default(""),
  ctaLabel: z.string().max(60).nullable().default(null),
  ctaUrl: z.string().max(500).nullable().default(null),
  variant: z.enum(["info", "success", "warning", "promo"]).default("info"),
  active: z.boolean().default(true),
});

export const saveAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => upsertSchema.parse(data))
  .handler(async ({ data, context }): Promise<Announcement> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      kind: data.kind,
      title: data.title,
      body: data.body,
      cta_label: data.ctaLabel || null,
      cta_url: data.ctaUrl || null,
      variant: data.variant,
      active: data.active,
    };
    const query = data.id
      ? supabaseAdmin.from("site_announcements").update(payload).eq("id", data.id).select(SELECT).single()
      : supabaseAdmin.from("site_announcements").insert(payload).select(SELECT).single();
    const { data: row, error } = await query;
    if (error) throw new Error(error.message);
    return toAnnouncement(row as Row);
  });

export const setAnnouncementActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), active: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("site_announcements").update({ active: data.active }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("site_announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
