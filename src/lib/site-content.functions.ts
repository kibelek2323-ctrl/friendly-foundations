import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireAppAuth } from "@/lib/app-auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export interface HomepageStat {
  value: string;
  label: string;
}

export interface HomepageContent {
  badgeIcon: string;
  badgeText: string;
  headlineBefore: string;
  headlineAccent: string;
  subtext: string;
  stats: HomepageStat[];
}

export const DEFAULT_HOMEPAGE: HomepageContent = {
  badgeIcon: "zap",
  badgeText: "No code. No hosting headaches.",
  headlineBefore: "Build Discord bots",
  headlineAccent: "visually",
  subtext:
    "Bottly turns embeds, slash commands, buttons and automations into a drag-and-drop workspace with a pixel-accurate Discord preview beside every change.",
  stats: [
    { value: "120k+", label: "bots built" },
    { value: "18M", label: "members reached" },
    { value: "99.9%", label: "uptime" },
  ],
};

/** Public: homepage hero content (falls back to defaults). */
export const getHomepageContent = createServerFn({ method: "GET" }).handler(async (): Promise<HomepageContent> => {
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
  const { data } = await supabasePublic.from("site_content").select("value").eq("key", "homepage").maybeSingle();
  const v = (data as { value?: Partial<HomepageContent> } | null)?.value;
  if (!v) return DEFAULT_HOMEPAGE;
  return {
    ...DEFAULT_HOMEPAGE,
    ...v,
    stats: Array.isArray(v.stats) && v.stats.length === 3 ? (v.stats as HomepageStat[]) : DEFAULT_HOMEPAGE.stats,
  };
});

const homepageSchema = z.object({
  badgeIcon: z.string().max(40),
  badgeText: z.string().max(120),
  headlineBefore: z.string().max(120),
  headlineAccent: z.string().max(60),
  subtext: z.string().max(500),
  stats: z.array(z.object({ value: z.string().max(20), label: z.string().max(40) })).length(3),
});

export const saveHomepageContent = createServerFn({ method: "POST" })
  .middleware([requireAppAuth])
  .inputValidator((data: unknown) => homepageSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (isAdmin !== true) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("site_content")
      .upsert({ key: "homepage", value: data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
