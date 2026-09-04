import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Monthly plan prices in whole USD (balance is stored in whole USD too). */
export const PLAN_PRICE_USD: Record<"pro" | "ultimate", number> = { pro: 12, ultimate: 29 };

export const MIN_TOPUP_USD = 5;
export const MAX_TOPUP_USD = 1000;
export const TOPUP_PRESETS = [5, 10, 25, 50, 100] as const;

const inputSchema = z.union([
  z.object({ purpose: z.literal("topup"), amount: z.number().int().min(MIN_TOPUP_USD).max(MAX_TOPUP_USD) }),
  z.object({ purpose: z.literal("plan"), plan: z.enum(["pro", "ultimate"]) }),
]);

export interface CryptoPaymentRow {
  id: string;
  purpose: string;
  plan: string | null;
  amount: number;
  status: string;
  payCurrency: string | null;
  createdAt: string;
}

/**
 * Creates a NOWPayments hosted invoice for a balance top-up or a 30-day plan.
 * The balance/plan is only granted once the IPN webhook confirms the payment.
 */
export interface CreatedCryptoPayment {
  ok: boolean;
  error?: string;
  /** Hosted checkout link (fallback / "open in new tab"). */
  url?: string;
  /** Embeddable NOWPayments widget URL for an iframe inside our own payment box. */
  widgetUrl?: string;
  orderId?: string;
  amount?: number;
}

export const createCryptoPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<CreatedCryptoPayment> => {
    const apiKey = process.env["NOWPAYMENTS_API_KEY"];
    if (!apiKey) return { ok: false, error: "Crypto payments are not configured yet." };

    const amount = data.purpose === "topup" ? data.amount : PLAN_PRICE_USD[data.plan];
    const orderId = `bottly_${data.purpose}_${crypto.randomUUID()}`;
    // PUBLIC_SITE_URL may be unset or malformed (e.g. missing scheme); NOWPayments
    // rejects anything that isn't a valid absolute URI, so fall back robustly.
    const rawOrigin = (process.env["PUBLIC_SITE_URL"] ?? "").trim().replace(/\/+$/, "");
    const origin = /^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(rawOrigin) ? rawOrigin : "https://bottly.xyz";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insertError } = await supabaseAdmin.from("crypto_payments").insert({
      user_id: context.userId,
      purpose: data.purpose,
      plan: data.purpose === "plan" ? data.plan : null,
      amount,
      order_id: orderId,
    });
    if (insertError) return { ok: false, error: "Could not start the payment. Please try again." };

    const description =
      data.purpose === "topup"
        ? `Bottly balance top-up ($${amount})`
        : `Bottly ${data.plan === "pro" ? "Pro" : "Ultimate"} plan — 30 days`;

    try {
      const res = await fetch("https://api.nowpayments.io/v1/invoice", {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          price_amount: amount,
          price_currency: "usd",
          order_id: orderId,
          order_description: description,
          is_fixed_rate: true,
          is_fee_paid_by_user: true,
          ipn_callback_url: `${origin}/api/public/webhooks/nowpayments`,
          success_url: `${origin}${data.purpose === "topup" ? "/balance" : "/billing"}?payment=success`,
          cancel_url: `${origin}${data.purpose === "topup" ? "/balance" : "/billing"}?payment=cancelled`,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`NOWPayments invoice failed [${res.status}]: ${body}`);
        await supabaseAdmin.from("crypto_payments").update({ status: "failed" }).eq("order_id", orderId);
        return { ok: false, error: "The payment provider rejected this request. Please try again later." };
      }

      const invoice = (await res.json()) as { id?: string | number; invoice_url?: string };
      if (!invoice.invoice_url) return { ok: false, error: "The payment provider returned no checkout link." };

      const invoiceId = invoice.id != null ? String(invoice.id) : null;
      await supabaseAdmin.from("crypto_payments").update({ invoice_id: invoiceId }).eq("order_id", orderId);

      const result: CreatedCryptoPayment = { ok: true, url: invoice.invoice_url, orderId, amount };
      if (invoiceId) result.widgetUrl = `https://nowpayments.io/embeds/payment-widget?iid=${invoiceId}`;
      return result;
    } catch (error) {
      console.error("NOWPayments invoice error", error);
      await supabaseAdmin.from("crypto_payments").update({ status: "failed" }).eq("order_id", orderId);
      return { ok: false, error: "Could not reach the payment provider." };
    }
  });

/** Recent crypto payments for the signed-in user. */
export const listCryptoPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CryptoPaymentRow[]> => {
    const { data } = await context.supabase
      .from("crypto_payments")
      .select("id, purpose, plan, amount, status, pay_currency, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(10);

    return (data ?? []).map((r) => ({
      id: r.id,
      purpose: r.purpose,
      plan: r.plan,
      amount: r.amount,
      status: r.status,
      payCurrency: r.pay_currency,
      createdAt: r.created_at,
    }));
  });

/** Statuses that mean the payment can no longer complete. */
export const FAILED_STATUSES = ["failed", "expired", "refunded"] as const;
/** Statuses that mean credits/plan have been (or are about to be) granted. */
export const SUCCESS_STATUSES = ["confirmed", "finished"] as const;

export interface CryptoPaymentStatus {
  status: string;
  credited: boolean;
  payCurrency: string | null;
  amount: number;
}

/**
 * Status of one of the signed-in user's own payments. Read-only: crediting happens
 * exclusively in the verified IPN webhook, never from the browser.
 */
export const getCryptoPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ orderId: z.string().min(8).max(128) }).parse(data))
  .handler(async ({ data, context }): Promise<CryptoPaymentStatus | null> => {
    const { data: row } = await context.supabase
      .from("crypto_payments")
      .select("status, credited_at, pay_currency, amount")
      .eq("order_id", data.orderId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!row) return null;
    return {
      status: row.status,
      credited: row.credited_at != null,
      payCurrency: row.pay_currency,
      amount: row.amount,
    };
  });
