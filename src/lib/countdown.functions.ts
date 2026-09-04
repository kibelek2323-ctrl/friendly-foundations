import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface CountdownSettings {
  /** When false, the site is open to everyone regardless of the launch date. */
  enabled: boolean;
  /** Launch timestamp in milliseconds since epoch. */
  launchAt: number;
}

/** Launch: 18 September 2026, 10:00 Europe/Warsaw (UTC+2). */
export const DEFAULT_LAUNCH_AT = Date.UTC(2026, 8, 18, 8, 0, 0);
export const DEFAULT_COUNTDOWN: CountdownSettings = { enabled: true, launchAt: DEFAULT_LAUNCH_AT };

export const getCountdownSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<CountdownSettings> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("app_settings").select("value").eq("key", "countdown").maybeSingle();
    const value = (data?.value ?? {}) as Partial<CountdownSettings>;
    return {
      enabled: typeof value.enabled === "boolean" ? value.enabled : DEFAULT_COUNTDOWN.enabled,
      launchAt: typeof value.launchAt === "number" ? value.launchAt : DEFAULT_COUNTDOWN.launchAt,
    };
  },
);

export const adminSaveCountdown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ enabled: z.boolean(), launchAt: z.number().int().min(0) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (isAdmin !== true) return { ok: false, error: "Forbidden" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "countdown", value: data, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) return { ok: false, error: "Could not save the countdown settings." };
    return { ok: true };
  });

export interface MaintenanceSettings {
  /** When true, everyone except admins sees the maintenance screen. */
  enabled: boolean;
  /** Short status line shown to visitors. */
  status: string;
  /** Expected end time (epoch ms) or null when unknown. */
  endsAt: number | null;
}

export const DEFAULT_MAINTENANCE: MaintenanceSettings = {
  enabled: false,
  status: "We are performing scheduled maintenance. Everything will be back shortly.",
  endsAt: null,
};

export interface SiteGate {
  countdown: CountdownSettings;
  maintenance: MaintenanceSettings;
}

export const getSiteGate = createServerFn({ method: "GET" }).handler(async (): Promise<SiteGate> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("app_settings").select("key, value").in("key", ["countdown", "maintenance"]);
  const rows = new Map((data ?? []).map((r) => [r.key, (r.value ?? {}) as Record<string, unknown>]));
  const c = rows.get("countdown") ?? {};
  const m = rows.get("maintenance") ?? {};
  return {
    countdown: {
      enabled: typeof c.enabled === "boolean" ? c.enabled : DEFAULT_COUNTDOWN.enabled,
      launchAt: typeof c.launchAt === "number" ? c.launchAt : DEFAULT_COUNTDOWN.launchAt,
    },
    maintenance: {
      enabled: typeof m.enabled === "boolean" ? m.enabled : DEFAULT_MAINTENANCE.enabled,
      status: typeof m.status === "string" && m.status.trim() ? m.status : DEFAULT_MAINTENANCE.status,
      endsAt: typeof m.endsAt === "number" ? m.endsAt : null,
    },
  };
});

export const adminSaveMaintenance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ enabled: z.boolean(), status: z.string().max(400), endsAt: z.number().int().min(0).nullable() })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (isAdmin !== true) return { ok: false, error: "Forbidden" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("app_settings")
      .upsert({ key: "maintenance", value: data, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) return { ok: false, error: "Could not save the maintenance settings." };
    return { ok: true };
  });
