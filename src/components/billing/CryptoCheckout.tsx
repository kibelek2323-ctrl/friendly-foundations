import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import QRCode from "qrcode";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usd } from "@/lib/money";
import {
  type CreatedCryptoPayment,
  type CryptoAddress,
  type CryptoPaymentStatus,
  createCryptoAddress,
  getCryptoPaymentStatus,
  listCryptoCoins,
} from "@/lib/crypto-payments.functions";

const FAILED = new Set(["failed", "expired", "refunded"]);
const DONE = new Set(["confirmed", "finished"]);

const STATUS_LABEL: Record<string, string> = {
  waiting: "Waiting for your transfer",
  confirming: "Transfer seen — waiting for confirmations",
  sending: "Payment is being processed",
  partially_paid: "Partial payment received — send the rest",
  confirmed: "Confirmed — crediting your account",
  finished: "Payment complete",
  failed: "The payment failed",
  expired: "This payment window expired",
  refunded: "This payment was refunded",
};

interface Props {
  payment: CreatedCryptoPayment;
  /** Called when the user closes the checkout (cancel or after completion). */
  onClose: () => void;
  /** Query keys to refresh once the balance/plan is credited. */
  refreshKeys?: string[][];
}

function CopyField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex items-stretch gap-2">
        <p
          className={`min-w-0 flex-1 break-all rounded-lg border border-border bg-elevated px-3 py-2 text-sm ${
            mono ? "font-mono" : "font-semibold"
          }`}
        >
          {value}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Copy ${label}`}
          className="h-auto shrink-0"
          onClick={() => {
            void navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [left, setLeft] = useState(() => new Date(expiresAt).getTime() - Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setLeft(new Date(expiresAt).getTime() - Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);
  if (!Number.isFinite(left) || left <= 0) return null;
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return (
    <span className="tabular-nums">
      {m}:{String(s).padStart(2, "0")}
    </span>
  );
}

function ConfirmationBar({
  confirmations,
  required,
  detected,
}: {
  confirmations: number;
  required: number;
  detected: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1" aria-hidden="true">
        {Array.from({ length: required }).map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < confirmations ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>
      <span className="shrink-0 tabular-nums text-muted-foreground">
        {detected ? `${confirmations}/${required} confs` : "No payment detected yet"}
      </span>
    </div>
  );
}

/**
 * Bottly-branded crypto checkout. NOWPayments stays the provider behind the
 * scenes, but every pixel here is ours: coin picker, QR code, deposit address
 * and live status polled from our own backend.
 */
export function CryptoCheckout({ payment, onClose, refreshKeys = [] }: Props) {
  const fetchStatus = useServerFn(getCryptoPaymentStatus);
  const makeAddress = useServerFn(createCryptoAddress);
  const fetchCoins = useServerFn(listCryptoCoins);
  const queryClient = useQueryClient();

  const coins = useQuery({ queryKey: ["crypto-coins"], queryFn: () => fetchCoins(), staleTime: 5 * 60_000 });
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [address, setAddress] = useState<CryptoAddress | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [qrMode, setQrMode] = useState<"address" | "amount">("amount");

  const [status, setStatus] = useState<string>("waiting");
  const [live, setLive] = useState<CryptoPaymentStatus | null>(null);
  const [credited, setCredited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshed = useRef(false);

  const coinList = coins.data ?? [];
  const activeCoin = useMemo(() => coinList.find((c) => c.code === selected) ?? null, [coinList, selected]);

  const pick = async (code: string) => {
    if (!payment.orderId) return;
    setSelected(code);
    setCreating(true);
    setAddressError(null);
    try {
      const res = await makeAddress({ data: { orderId: payment.orderId, payCurrency: code } });
      if (res.ok) setAddress(res);
      else {
        setAddressError(res.error ?? "Could not create the payment.");
        setSelected(null);
      }
    } catch {
      setAddressError("Could not reach the payment provider.");
      setSelected(null);
    } finally {
      setCreating(false);
    }
  };

  const qrValue = useMemo(
    () =>
      address?.payAddress
        ? qrMode === "amount"
          ? buildPaymentUri(address.payCurrency, address.payAddress, address.payAmount, address.payinExtraId)
          : address.payAddress
        : null,
    [address?.payAddress, address?.payAmount, address?.payCurrency, address?.payinExtraId, qrMode],
  );

  // QR code for the deposit address (rendered with Bottly's palette).
  useEffect(() => {
    if (!qrValue) {
      setQr(null);
      return;
    }
    let active = true;
    void QRCode.toDataURL(qrValue, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: "M",
      color: { dark: "#0b1220ff", light: "#ffffffff" },
    }).then((url) => {
      if (active) setQr(url);
    });
    return () => {
      active = false;
    };
  }, [address?.payAddress]);

  // Poll our own backend for the authoritative status.
  useEffect(() => {
    if (!payment.orderId) return;
    let active = true;
    const tick = async () => {
      try {
        const res = await fetchStatus({ data: { orderId: payment.orderId! } });
        if (!active || !res) return;
        setStatus(res.status);
        setLive(res);
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
    const id = window.setInterval(() => void tick(), 5000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment.orderId]);

  const failed = FAILED.has(status);
  const done = DONE.has(status) || credited;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {address && !done && !failed && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Choose another coin"
            onClick={() => {
              setAddress(null);
              setSelected(null);
            }}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
        )}
        <div className="mr-auto min-w-0">
          <p className="truncate text-sm font-semibold">
            {payment.amount != null ? `${usd(payment.amount)} with crypto` : "Crypto payment"}
          </p>
          <p className="text-xs text-muted-foreground">Secured by Bottly · settled on-chain</p>
        </div>
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
      ) : !address ? (
        /* ---- Step 1: pick a coin ---- */
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Choose how to pay</p>
          {coins.isLoading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading coins…
            </div>
          ) : (
            <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
              {coinList.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  disabled={creating}
                  onClick={() => void pick(c.code)}
                  className="group relative flex items-center gap-2.5 rounded-xl border border-border bg-elevated p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary disabled:opacity-60"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                    {c.symbol.slice(0, 4)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{c.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{c.network ?? c.symbol}</span>
                  </span>
                  {creating && selected === c.code && (
                    <Loader2 className="absolute right-2 size-4 animate-spin text-primary" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          )}
          {addressError && <p className="text-xs text-destructive">{addressError}</p>}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
            Your balance is credited automatically once the network confirms the transfer.
          </p>
        </div>
      ) : (
        /* ---- Step 2: pay ---- */
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
            <div className="mx-auto rounded-2xl border border-border bg-white p-3">
              {qr ? (
                <img src={qr} alt="Deposit address QR code" className="size-40 rounded-lg sm:size-44" />
              ) : (
                <div className="flex size-40 items-center justify-center sm:size-44">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <CopyField
                label={`Amount (${address.payCurrency})`}
                value={`${address.payAmount}`}
                mono={false}
              />
              <CopyField label="Deposit address" value={address.payAddress ?? ""} />
              {address.payinExtraId && <CopyField label="Memo / tag" value={address.payinExtraId} />}
            </div>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
            Send exactly{" "}
            <span className="font-semibold text-foreground">
              {address.payAmount} {address.payCurrency}
            </span>{" "}
            {activeCoin?.network ? `on the ${activeCoin.network} network ` : ""}to the address above. Sending a
            different amount or network can delay or lose the payment.
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-elevated px-3 py-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden="true" />
              <span className="font-medium">{STATUS_LABEL[status] ?? "Waiting for your transfer"}</span>
              {address.expiresAt && (
                <span className="ml-auto text-muted-foreground">
                  Expires in <Countdown expiresAt={address.expiresAt} />
                </span>
              )}
            </div>
            <ConfirmationBar
              confirmations={live?.confirmations ?? 0}
              required={live?.requiredConfirmations ?? 2}
              detected={(live?.confirmations ?? 0) > 0 || (live?.actuallyPaid ?? 0) > 0}
            />
            {(live?.actuallyPaid ?? 0) > 0 && (
              <p className="text-muted-foreground">
                Received{" "}
                <span className="font-medium text-foreground">
                  {live?.actuallyPaid} {address.payCurrency}
                </span>{" "}
                of {address.payAmount} {address.payCurrency}
              </p>
            )}
            {live?.explorerUrl && (
              <a
                href={live.explorerUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                View your payment on the blockchain
                <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {(done || failed) && (
        <div className="flex justify-end">
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      )}
    </div>
  );
}
