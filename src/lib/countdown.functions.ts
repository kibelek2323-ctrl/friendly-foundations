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
