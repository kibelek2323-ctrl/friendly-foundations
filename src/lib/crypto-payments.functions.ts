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
  z.object({
    purpose: z.literal("plan"),
    plan: z.enum(["pro", "ultimate"]),
    code: z.string().max(64).optional(),
  }),
]);

export interface CryptoPaymentRow {
  id: string;
  orderId: string;
  purpose: string;
  plan: string | null;
  amount: number;
  status: string;
  credited: boolean;
  payCurrency: string | null;
  payAmount: number | null;
  payAddress: string | null;
  expiresAt: string | null;
  explorerUrl: string | null;
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
  orderId?: string;
  amount?: number;
}

export const createCryptoPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<CreatedCryptoPayment> => {
    const apiKey = process.env["NOWPAYMENTS_API_KEY"];
    if (!apiKey) return { ok: false, error: "Crypto payments are not configured yet." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let amount = data.purpose === "topup" ? data.amount : PLAN_PRICE_USD[data.plan];
    let appliedCodeId: string | null = null;
    if (data.purpose === "plan" && data.code && data.code.trim()) {
      const quote = await quotePlan(data.code, PLAN_PRICE_USD[data.plan]);
      if (!quote.ok) return { ok: false, error: quote.error ?? "Invalid discount code." };
      amount = quote.finalPrice!;
      appliedCodeId = quote.id!;
    }
    const orderId = `bottly_${data.purpose}_${crypto.randomUUID()}`;
    // PUBLIC_SITE_URL may be unset or malformed (e.g. missing scheme); NOWPayments
    // rejects anything that isn't a valid absolute URI, so fall back robustly.
    const rawOrigin = (process.env["PUBLIC_SITE_URL"] ?? "").trim().replace(/\/+$/, "");
    const origin = /^https?:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(rawOrigin) ? rawOrigin : "https://bottly.xyz";

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

      if (appliedCodeId) {
        const { data: codeRow } = await supabaseAdmin
          .from("discount_codes")
          .select("used_count")
          .eq("id", appliedCodeId)
          .maybeSingle();
        await supabaseAdmin
          .from("discount_codes")
          .update({ used_count: (codeRow?.used_count ?? 0) + 1 })
          .eq("id", appliedCodeId);
      }

      return { ok: true, url: invoice.invoice_url, orderId, amount };
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
      .select(
        "id, order_id, purpose, plan, amount, status, credited_at, pay_currency, pay_amount, pay_address, expires_at, created_at",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(25);

    return (data ?? []).map((r) => ({
      id: r.id,
      orderId: r.order_id,
      purpose: r.purpose,
      plan: r.plan,
      amount: r.amount,
      status: r.status,
      credited: r.credited_at != null,
      payCurrency: r.pay_currency,
      payAmount: r.pay_amount != null ? Number(r.pay_amount) : null,
      payAddress: r.pay_address,
      expiresAt: r.expires_at,
      explorerUrl: addressExplorerUrl(r.pay_currency, r.pay_address),
    createdAt: r.created_at,
    }));
  });


/* ------------------------------------------------------------------ */
/* Custom checkout: coin list + address generation                     */
/* ------------------------------------------------------------------ */

export interface CryptoCoin {
  /** NOWPayments currency ticker, e.g. "usdttrc20". */
  code: string;
  /** Human label, e.g. "Tether". */
  name: string;
  /** Short symbol shown in the picker, e.g. "USDT". */
  symbol: string;
  /** Network label, e.g. "TRC-20". */
  network?: string;
}

/** Curated set of coins we offer, in display order. */
const COIN_CATALOG: CryptoCoin[] = [
  { code: "btc", name: "Bitcoin", symbol: "BTC" },
  { code: "eth", name: "Ethereum", symbol: "ETH", network: "ERC-20" },
  { code: "usdttrc20", name: "Tether", symbol: "USDT", network: "TRC-20" },
  { code: "usdterc20", name: "Tether", symbol: "USDT", network: "ERC-20" },
  { code: "usdcmatic", name: "USD Coin", symbol: "USDC", network: "Polygon" },
  { code: "usdc", name: "USD Coin", symbol: "USDC", network: "ERC-20" },
  { code: "sol", name: "Solana", symbol: "SOL" },
  { code: "ltc", name: "Litecoin", symbol: "LTC" },
  { code: "trx", name: "TRON", symbol: "TRX" },
  { code: "ton", name: "Toncoin", symbol: "TON" },
  { code: "bnbbsc", name: "BNB", symbol: "BNB", network: "BSC" },
  { code: "doge", name: "Dogecoin", symbol: "DOGE" },
  { code: "xmr", name: "Monero", symbol: "XMR" },
  { code: "matic", name: "Polygon", symbol: "POL", network: "Polygon" },
];

/** Coins the merchant account actually accepts, filtered to our catalog. */
export const listCryptoCoins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<CryptoCoin[]> => {
    const apiKey = process.env["NOWPAYMENTS_API_KEY"];
    if (!apiKey) return [];
    try {
      const res = await fetch("https://api.nowpayments.io/v1/merchants/coins", {
        headers: { "x-api-key": apiKey },
      });
      if (!res.ok) return COIN_CATALOG;
      const body = (await res.json()) as { selectedCurrencies?: string[] };
      const enabled = new Set((body.selectedCurrencies ?? []).map((c) => c.toLowerCase()));
      if (enabled.size === 0) return COIN_CATALOG;
      const filtered = COIN_CATALOG.filter((c) => enabled.has(c.code));
      return filtered.length > 0 ? filtered : COIN_CATALOG;
    } catch {
      return COIN_CATALOG;
    }
  });

export interface CryptoAddress {
  ok: boolean;
  error?: string | undefined;
  payAddress?: string | undefined;
  payAmount?: number | undefined;
  payCurrency?: string | undefined;
  network?: string | undefined;
  /** Extra memo/tag some chains require. */
  payinExtraId?: string | null | undefined;
  expiresAt?: string | null | undefined;
  paymentId?: string | undefined;
}

/**
 * Turns an existing invoice into a concrete on-chain payment for one coin and
 * returns the deposit address so we can render our own checkout (no widget).
 */
export const createCryptoAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ orderId: z.string().min(8).max(128), payCurrency: z.string().min(2).max(24) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<CryptoAddress> => {
    const apiKey = process.env["NOWPAYMENTS_API_KEY"];
    if (!apiKey) return { ok: false, error: "Crypto payments are not configured yet." };
    if (!COIN_CATALOG.some((c) => c.code === data.payCurrency)) {
      return { ok: false, error: "That coin is not supported." };
    }

    const { data: row } = await context.supabase
      .from("crypto_payments")
      .select("invoice_id, amount, credited_at")
      .eq("order_id", data.orderId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!row?.invoice_id) return { ok: false, error: "This payment could not be found." };
    if (row.credited_at) return { ok: false, error: "This payment is already complete." };

    try {
      const res = await fetch("https://api.nowpayments.io/v1/invoice-payment", {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          iid: Number(row.invoice_id),
          pay_currency: data.payCurrency,
          order_description: "Bottly",
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error(`NOWPayments invoice-payment failed [${res.status}]: ${body}`);
        return { ok: false, error: "That coin could not be used right now. Try another one." };
      }
      const p = (await res.json()) as {
        payment_id?: string | number;
        pay_address?: string;
        pay_amount?: number;
        pay_currency?: string;
        network?: string;
        payin_extra_id?: string | null;
        expiration_estimate_date?: string;
        valid_until?: string;
      };
      if (!p.pay_address || p.pay_amount == null) {
        return { ok: false, error: "The payment provider returned no deposit address." };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("crypto_payments")
        .update({
          payment_id: p.payment_id != null ? String(p.payment_id) : null,
          pay_currency: p.pay_currency ?? data.payCurrency,
          pay_amount: p.pay_amount,
          pay_address: p.pay_address,
          expires_at: p.valid_until ?? p.expiration_estimate_date ?? null,
        })
        .eq("order_id", data.orderId)
        .is("credited_at", null);

      return {
        ok: true,
        payAddress: p.pay_address,
        payAmount: p.pay_amount,
        payCurrency: (p.pay_currency ?? data.payCurrency).toUpperCase(),
        network: p.network ?? undefined,
        payinExtraId: p.payin_extra_id ?? null,
        expiresAt: p.valid_until ?? p.expiration_estimate_date ?? null,
        paymentId: p.payment_id != null ? String(p.payment_id) : undefined,
      };
    } catch (error) {
      console.error("NOWPayments invoice-payment error", error);
      return { ok: false, error: "Could not reach the payment provider." };
    }
  });

export interface CryptoPaymentStatus {
  status: string;
  credited: boolean;
  payCurrency: string | null;
  amount: number;
  /** How much of the expected coin amount arrived so far. */
  actuallyPaid: number | null;
  payAmount: number | null;
  /** Rough confirmation progress derived from the provider status. */
  confirmations: number;
  requiredConfirmations: number;
  /** Link to the transaction (or deposit address) on a block explorer. */
  explorerUrl: string | null;
  txHash: string | null;
}

/** Block explorers per coin — {v} is the tx hash, {a} the address. */
const EXPLORERS: Record<string, { tx: string; address: string }> = {
  btc: { tx: "https://mempool.space/tx/{v}", address: "https://mempool.space/address/{a}" },
  eth: { tx: "https://etherscan.io/tx/{v}", address: "https://etherscan.io/address/{a}" },
  usdterc20: { tx: "https://etherscan.io/tx/{v}", address: "https://etherscan.io/address/{a}" },
  usdc: { tx: "https://etherscan.io/tx/{v}", address: "https://etherscan.io/address/{a}" },
  usdttrc20: { tx: "https://tronscan.org/#/transaction/{v}", address: "https://tronscan.org/#/address/{a}" },
  trx: { tx: "https://tronscan.org/#/transaction/{v}", address: "https://tronscan.org/#/address/{a}" },
  sol: { tx: "https://solscan.io/tx/{v}", address: "https://solscan.io/account/{a}" },
  ltc: { tx: "https://blockchair.com/litecoin/transaction/{v}", address: "https://blockchair.com/litecoin/address/{a}" },
  doge: { tx: "https://blockchair.com/dogecoin/transaction/{v}", address: "https://blockchair.com/dogecoin/address/{a}" },
  ton: { tx: "https://tonviewer.com/transaction/{v}", address: "https://tonviewer.com/{a}" },
  bnbbsc: { tx: "https://bscscan.com/tx/{v}", address: "https://bscscan.com/address/{a}" },
  matic: { tx: "https://polygonscan.com/tx/{v}", address: "https://polygonscan.com/address/{a}" },
  usdcmatic: { tx: "https://polygonscan.com/tx/{v}", address: "https://polygonscan.com/address/{a}" },
};

function explorerUrl(currency: string | null, txHash: string | null, address: string | null): string | null {
  const e = EXPLORERS[(currency ?? "").toLowerCase()];
  if (!e) return null;
  if (txHash) return e.tx.replace("{v}", txHash);
  if (address) return e.address.replace("{a}", address);
  return null;
}

function addressExplorerUrl(currency: string | null, address: string | null): string | null {
  return explorerUrl(currency, null, address);
}

/** waiting -> 0, confirming/sending -> 1, confirmed/finished -> 2 out of 2. */
function progressOf(status: string): number {
  if (status === "confirmed" || status === "finished") return 2;
  if (status === "confirming" || status === "sending" || status === "partially_paid") return 1;
  return 0;
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
      .select("status, credited_at, pay_currency, amount, payment_id, pay_amount, pay_address")
      .eq("order_id", data.orderId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!row) return null;

    let status = row.status;
    let actuallyPaid: number | null = null;
    let txHash: string | null = null;
    let confirmations: number | null = null;
    // Mirror the provider's live status for the UI. Credits are still granted
    // only by the signature-verified IPN webhook.
    const apiKey = process.env["NOWPAYMENTS_API_KEY"];
    if (apiKey && row.payment_id && !row.credited_at) {
      try {
        const res = await fetch(`https://api.nowpayments.io/v1/payment/${row.payment_id}`, {
          headers: { "x-api-key": apiKey },
        });
        if (res.ok) {
          const p = (await res.json()) as {
            payment_status?: string;
            actually_paid?: number;
            payin_hash?: string | null;
            outcome?: { hash?: string | null } | null;
          };
          if (typeof p.actually_paid === "number") actuallyPaid = p.actually_paid;
          txHash = p.payin_hash ?? p.outcome?.hash ?? null;
          if (p.payment_status && p.payment_status !== status) {
            status = p.payment_status;
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin
              .from("crypto_payments")
              .update({ status })
              .eq("order_id", data.orderId)
              .is("credited_at", null);
          }
        }
      } catch {
        /* keep the stored status */
      }
    }

    const credited = row.credited_at != null;
    return {
      status,
      credited,
      payCurrency: row.pay_currency,
      amount: row.amount,
      actuallyPaid,
      payAmount: row.pay_amount != null ? Number(row.pay_amount) : null,
      confirmations: confirmations ?? (credited ? 2 : progressOf(status)),
      requiredConfirmations: 2,
      explorerUrl: explorerUrl(row.pay_currency, txHash, row.pay_address),
      txHash,
    };
  });



/* ------------------------------------------------------------------ */
/* Plan discount codes                                                 */
/* ------------------------------------------------------------------ */

interface PlanQuote {
  ok: boolean;
  error?: string;
  id?: string;
  percent?: number;
  price?: number;
  finalPrice?: number;
}

/** Validates a marketplace-wide (listing-less) percentage code against a plan price. */
async function quotePlan(rawCode: string, price: number): Promise<PlanQuote> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const code = rawCode.trim().toUpperCase();
  const { data: row } = await supabaseAdmin
    .from("discount_codes")
    .select("id, code, percent, listing_id, max_uses, used_count, expires_at, active")
    .ilike("code", code)
    .maybeSingle();
  if (!row) return { ok: false, error: "Invalid discount code." };
  if (!row.active) return { ok: false, error: "This code is no longer active." };
  if (row.expires_at && new Date(row.expires_at) < new Date()) return { ok: false, error: "This code has expired." };
  if (row.used_count >= row.max_uses) return { ok: false, error: "This code has been fully used." };
  if (row.listing_id) return { ok: false, error: "This code only works on a marketplace bot." };
  const finalPrice = Math.max(1, price - Math.floor((price * row.percent) / 100));
  return { ok: true, id: row.id, percent: row.percent, price, finalPrice };
}

/** Preview of a discount code applied to a plan price, for the billing page. */
export const quotePlanDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ plan: z.enum(["pro", "ultimate"]), code: z.string().min(2).max(64) }).parse(data),
  )
  .handler(async ({ data }): Promise<PlanQuote> => quotePlan(data.code, PLAN_PRICE_USD[data.plan]));
