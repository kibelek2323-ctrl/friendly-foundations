import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usd } from "@/lib/money";
import {
  type CreatedCryptoPayment,
  getCryptoPaymentStatus,
} from "@/lib/crypto-payments.functions";

const FAILED = new Set(["failed", "expired", "refunded"]);
const DONE = new Set(["confirmed", "finished"]);

const STATUS_LABEL: Record<string, string> = {
  waiting: "Waiting for your payment…",
  confirming: "Payment seen — waiting for blockchain confirmations…",
  sending: "Payment is being processed…",
  partially_paid: "Partial payment received — send the remaining amount.",
  confirmed: "Payment confirmed. Crediting your account…",
  finished: "Payment complete.",
  failed: "The payment failed.",
  expired: "This payment window expired.",
  refunded: "This payment was refunded.",
};

interface Props {
  payment: CreatedCryptoPayment;
  /** Called when the user closes the widget (cancel or after completion). */
  onClose: () => void;
  /** Query keys to refresh once the balance/plan is credited. */
  refreshKeys?: string[][];
}

/**
 * Embeds the official NOWPayments widget inside Bottly's own payment box and
 * polls our backend (never the widget) for the authoritative payment status.
 */
export function CryptoCheckout({ payment, onClose, refreshKeys = [] }: Props) {
  const fetchStatus = useServerFn(getCryptoPaymentStatus);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("waiting");
  const [credited, setCredited] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshed = useRef(false);

  useEffect(() => {
    if (!payment.orderId) return;
    let active = true;
    const tick = async () => {
      try {
        const res = await fetchStatus({ data: { orderId: payment.orderId! } });
        if (!active || !res) return;
        setStatus(res.status);
        setCredited(res.credited);
        setError(null);
        if (res.credited && !refreshed.current) {
          refreshed.current = true;
          for (const key of refreshKeys) void queryClient.invalidateQueries({ queryKey: key });
        }
      } catch {
        if (active) setError("Could not check the payment status. Retrying…");
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 6000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment.orderId]);

  const failed = FAILED.has(status);
  const done = DONE.has(status) || credited;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="mr-auto text-sm font-medium">
          Paying {payment.amount != null ? usd(payment.amount) : ""} with crypto
        </p>
        <Button variant="ghost" size="icon" aria-label="Cancel payment" onClick={onClose}>
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {done ? (
        <div className="flex items-start gap-3 rounded-xl border border-success/40 bg-success/10 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium">Payment complete</p>
            <p className="text-muted-foreground">
              {credited
                ? "Your account has been updated — the new balance is shown above."
                : "Confirmed on-chain. Your account updates within a moment."}
            </p>
          </div>
        </div>
      ) : failed ? (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium">{STATUS_LABEL[status] ?? "The payment did not go through."}</p>
            <p className="text-muted-foreground">Nothing was charged to your Bottly account. You can start again.</p>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-border bg-elevated">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          {payment.widgetUrl ? (
            <iframe
              src={payment.widgetUrl}
              title="NOWPayments checkout"
              onLoad={() => setLoaded(true)}
              className="h-[26rem] w-full sm:h-[30rem]"
              allow="payment"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              The embedded checkout is unavailable. Use the link below to pay.
            </div>
          )}
        </div>
      )}

      {!done && !failed && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          {STATUS_LABEL[status] ?? "Waiting for your payment…"}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {payment.url && !done && !failed && (
          <a
            href={payment.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" /> Open checkout in a new tab
          </a>
        )}
        {(done || failed) && (
          <Button size="sm" className="ml-auto" onClick={onClose}>
            Done
          </Button>
        )}
      </div>
    </div>
  );
}
