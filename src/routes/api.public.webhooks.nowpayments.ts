import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/** NOWPayments signs the IPN body as HMAC-SHA512 over the JSON with sorted keys. */
function sortedStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(sortedStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${sortedStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * NOWPayments IPN callback. Public by necessity — every request is authenticated
 * by verifying the provider's HMAC signature before any balance is credited.
 */
export const Route = createFileRoute("/api/public/webhooks/nowpayments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["NOWPAYMENTS_IPN_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });

        const raw = await request.text();
        const signature = request.headers.get("x-nowpayments-sig") ?? "";

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const expected = createHmac("sha512", secret).update(sortedStringify(payload)).digest("hex");
        const sig = Buffer.from(signature);
        const exp = Buffer.from(expected);
        if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const orderId = typeof payload["order_id"] === "string" ? payload["order_id"] : null;
        const status = typeof payload["payment_status"] === "string" ? payload["payment_status"] : "";
        if (!orderId) return new Response("Missing order", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const paymentId = payload["payment_id"] != null ? String(payload["payment_id"]) : null;
        const payCurrency = typeof payload["pay_currency"] === "string" ? payload["pay_currency"] : null;

        if (status === "finished" || status === "confirmed") {
          const { error } = await supabaseAdmin.rpc("credit_crypto_payment", {
            _order_id: orderId,
            _payment_id: paymentId ?? "",
            _pay_currency: payCurrency ?? "",
          });
          if (error) {
            console.error("credit_crypto_payment failed", error);
            return new Response("Credit failed", { status: 500 });
          }
        } else {
          await supabaseAdmin
            .from("crypto_payments")
            .update({ status: status || "waiting", payment_id: paymentId, pay_currency: payCurrency })
            .eq("order_id", orderId)
            .is("credited_at", null);
        }

        return new Response("ok", { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
