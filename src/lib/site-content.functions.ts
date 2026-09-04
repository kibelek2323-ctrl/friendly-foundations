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

/* ------------------------------------------------------------------ */
/* Status page + FAQ content (admin editable)                          */
/* ------------------------------------------------------------------ */

export type ServiceState = "operational" | "degraded" | "down";

export interface StatusService {
  name: string;
  state: ServiceState;
}

export interface StatusContent {
  headline: string;
  note: string;
  services: StatusService[];
}

export const DEFAULT_STATUS: StatusContent = {
  headline: "All systems operational",
  note: "Current status of Bottly's core services.",
  services: [
    { name: "Dashboard & builder", state: "operational" },
    { name: "Bot runtime", state: "operational" },
    { name: "Marketplace", state: "operational" },
    { name: "Authentication", state: "operational" },
    { name: "Cloud storage", state: "operational" },
  ],
};

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqContent {
  items: FaqItem[];
}

export const DEFAULT_FAQ: FaqContent = {
  items: [
    { question: "Do I need to know how to code?", answer: "No. Bottly gives you visual editors for messages, slash commands, components and automation flows." },
    { question: "How do I connect my Discord bot?", answer: "Create an application in Discord, add its bot token in Bottly Settings, then use the generated invite link to add it to your server." },
    { question: "Can Bottly run my bot?", answer: "Yes. Once a valid token is connected, runtime controls let you start, stop and monitor the bot from the dashboard." },
    { question: "What can I buy in the marketplace?", answer: "Marketplace listings are complete bot snapshots. After purchase, the bot appears in your workspace and its appearance can be customised." },
    { question: "How does marketplace balance work?", answer: "Balance is displayed in USD. Redeem a balance code on the Balance page, then use those funds for marketplace purchases." },
    { question: "Are uploaded screenshots public?", answer: "Marketplace screenshots are stored privately and delivered through time-limited links when a published listing is viewed." },
    { question: "What happens to my bot token?", answer: "Tokens are verified and encrypted on the server. They are never returned to your browser after being saved." },
  ],
};

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
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
}

export const getStatusContent = createServerFn({ method: "GET" }).handler(async (): Promise<StatusContent> => {
  const { data } = await publicClient().from("site_content").select("value").eq("key", "status").maybeSingle();
  const v = (data as { value?: Partial<StatusContent> } | null)?.value;
  if (!v) return DEFAULT_STATUS;
  return {
    headline: v.headline ?? DEFAULT_STATUS.headline,
    note: v.note ?? DEFAULT_STATUS.note,
    services: Array.isArray(v.services) && v.services.length ? (v.services as StatusService[]) : DEFAULT_STATUS.services,
  };
});

export const getFaqContent = createServerFn({ method: "GET" }).handler(async (): Promise<FaqContent> => {
  const { data } = await publicClient().from("site_content").select("value").eq("key", "faq").maybeSingle();
  const v = (data as { value?: Partial<FaqContent> } | null)?.value;
  const items = Array.isArray(v?.items) && v.items.length ? (v.items as FaqItem[]) : DEFAULT_FAQ.items;
  return { items };
});

async function assertAdminSave(
  supabase: { rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown }> },
  userId: string,
  key: string,
  value: unknown,
) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin !== true) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("site_content")
    .upsert({ key, value: value as never, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export const saveStatusContent = createServerFn({ method: "POST" })
  .middleware([requireAppAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        headline: z.string().min(1).max(120),
        note: z.string().max(300),
        services: z
          .array(z.object({ name: z.string().min(1).max(80), state: z.enum(["operational", "degraded", "down"]) }))
          .max(20),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => assertAdminSave(context.supabase as never, context.userId, "status", data));

export const saveFaqContent = createServerFn({ method: "POST" })
  .middleware([requireAppAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        items: z.array(z.object({ question: z.string().min(1).max(200), answer: z.string().min(1).max(1200) })).max(40),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => assertAdminSave(context.supabase as never, context.userId, "faq", data));
