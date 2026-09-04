import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface TwoFactorStatus {
  enabled: boolean;
  backupCodesLeft: number;
  email: string | null;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomDigits(length: number): string {
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (v) => String(v % 10)).join("");
}

function randomBackupCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = crypto.getRandomValues(new Uint32Array(10));
  const chars = Array.from(values, (v) => alphabet[v % alphabet.length]);
  return `${chars.slice(0, 5).join("")}-${chars.slice(5).join("")}`;
}

export const getTwoFactorStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TwoFactorStatus> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: row }, { data: userRes }] = await Promise.all([
      supabaseAdmin.from("user_2fa").select("email_enabled, backup_codes").eq("user_id", context.userId).maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(context.userId),
    ]);
    return {
      enabled: row?.email_enabled ?? false,
      backupCodesLeft: (row?.backup_codes ?? []).length,
      email: userRes?.user?.email ?? null,
    };
  });

/** Emails a fresh 6-digit code to the signed-in user. */
export const sendTwoFactorCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ purpose: z.enum(["login", "enable", "disable"]).default("login") }).parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string; email?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = userRes?.user?.email;
    if (!email) return { ok: false, error: "This account has no email address." };

    const { count } = await supabaseAdmin
      .from("email_otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString());
    if ((count ?? 0) >= 5) return { ok: false, error: "Too many codes requested. Try again in a few minutes." };

    const code = randomDigits(6);
    const { error } = await supabaseAdmin.from("email_otp_codes").insert({
      user_id: context.userId,
      email,
      code_hash: await sha256(`${context.userId}:${code}`),
      purpose: data.purpose,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (error) return { ok: false, error: "Could not create a code. Please try again." };

    const { sendTransactionalEmail, otpEmailHtml } = await import("./email.server");
    try {
      await sendTransactionalEmail({ to: email, subject: `${code} is your Bottly code`, html: otpEmailHtml(code) });
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Could not send the email." };
    }
    const [name, domain] = email.split("@");
    return { ok: true, email: `${(name ?? "").slice(0, 2)}***@${domain ?? ""}` };
  });

async function consumeCode(userId: string, code: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const clean = code.trim().toUpperCase();

  if (clean.includes("-")) {
    const { data: row } = await supabaseAdmin
      .from("user_2fa")
      .select("backup_codes")
      .eq("user_id", userId)
      .maybeSingle();
    const hashes = row?.backup_codes ?? [];
    const hash = await sha256(`${userId}:${clean}`);
    if (!hashes.includes(hash)) return false;
    await supabaseAdmin
      .from("user_2fa")
      .update({ backup_codes: hashes.filter((h) => h !== hash), updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    return true;
  }

  const hash = await sha256(`${userId}:${clean}`);
  const { data: rows } = await supabaseAdmin
    .from("email_otp_codes")
    .select("id, code_hash, expires_at, consumed_at")
    .eq("user_id", userId)
    .is("consumed_at", null)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(5);
  const match = (rows ?? []).find((r) => r.code_hash === hash);
  if (!match) return false;
  await supabaseAdmin.from("email_otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", match.id);
  return true;
}

/** Verifies a login challenge code (email code or backup code). */
export const verifyTwoFactorCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ code: z.string().min(4).max(20) }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const ok = await consumeCode(context.userId, data.code);
    return ok ? { ok: true } : { ok: false, error: "That code is invalid or has expired." };
  });

/** Turns email 2FA on and returns one-time backup codes. */
export const enableTwoFactor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ code: z.string().min(4).max(20) }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string; backupCodes?: string[] }> => {
    if (!(await consumeCode(context.userId, data.code))) {
      return { ok: false, error: "That code is invalid or has expired." };
    }
    const codes = Array.from({ length: 8 }, () => randomBackupCode());
    const hashes = await Promise.all(codes.map((c) => sha256(`${context.userId}:${c}`)));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_2fa").upsert(
      { user_id: context.userId, email_enabled: true, backup_codes: hashes, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (error) return { ok: false, error: "Could not enable two-factor authentication." };
    return { ok: true, backupCodes: codes };
  });

export const disableTwoFactor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ code: z.string().min(4).max(20) }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    if (!(await consumeCode(context.userId, data.code))) {
      return { ok: false, error: "That code is invalid or has expired." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("user_2fa")
      .upsert(
        { user_id: context.userId, email_enabled: false, backup_codes: [], updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    return { ok: true };
  });

/** Called right after a password sign-in to learn whether a code is required. */
export const startLoginChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ required: boolean; sent: boolean; error?: string; email?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("user_2fa")
      .select("email_enabled")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!row?.email_enabled) return { required: false, sent: false };

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = userRes?.user?.email;
    if (!email) return { required: true, sent: false, error: "This account has no email address." };

    const code = randomDigits(6);
    await supabaseAdmin.from("email_otp_codes").insert({
      user_id: context.userId,
      email,
      code_hash: await sha256(`${context.userId}:${code}`),
      purpose: "login",
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    const { sendTransactionalEmail, otpEmailHtml } = await import("./email.server");
    try {
      await sendTransactionalEmail({ to: email, subject: `${code} is your Bottly code`, html: otpEmailHtml(code) });
    } catch (err) {
      return { required: true, sent: false, error: err instanceof Error ? err.message : "Could not send the email." };
    }
    const [name, domain] = email.split("@");
    return { required: true, sent: true, email: `${(name ?? "").slice(0, 2)}***@${domain ?? ""}` };
  });
