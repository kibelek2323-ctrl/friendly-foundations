import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Bitcoin, DollarSign, Loader2, Plus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getBalanceHistory, redeemBalanceCode } from "@/lib/marketplace.functions";
import { usd } from "@/lib/money";
import {
  type CreatedCryptoPayment,
  MAX_TOPUP_USD,
  MIN_TOPUP_USD,
  TOPUP_PRESETS,
  createCryptoPayment,
} from "@/lib/crypto-payments.functions";
import { CryptoCheckout } from "@/components/billing/CryptoCheckout";

export const Route = createFileRoute("/_authenticated/balance")({
  head: () => ({
    meta: [
      { title: "Balance & top-up — Bottly" },
      { name: "description", content: "Track your Bottly USD balance, transaction history and top up with a code." },
      { property: "og:title", content: "Balance & top-up — Bottly" },
      { property: "og:description", content: "Track your Bottly USD balance, transaction history and top up with a code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const fetchHistory = useServerFn(getBalanceHistory);
  const redeem = useServerFn(redeemBalanceCode);
  const history = useQuery({ queryKey: ["balance-history"], queryFn: () => fetchHistory() });

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState<number>(10);
  const [paying, setPaying] = useState(false);
  const [checkout, setCheckout] = useState<CreatedCryptoPayment | null>(null);
  const startPayment = useServerFn(createCryptoPayment);

  const payWithCrypto = async () => {
    setPaying(true);
    try {
      const res = await startPayment({ data: { purpose: "topup", amount } });
      if (res.ok) {
        setCheckout(res);
      } else {
        toast.error(res.error ?? "Could not start the payment.");
      }
    } catch {
      toast.error("Could not start the payment.");
    } finally {
      setPaying(false);
    }
  };

  const closeCheckout = () => {
    setCheckout(null);
    void history.refetch();
  };

  const submit = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const res = await redeem({ data: { code: code.trim() } });
      if (res.ok) {
        toast.success(`${usd(res.amount ?? 0)} added to your balance`);
        setCode("");
        setOpen(false);
        void history.refetch();
      } else {
        toast.error(res.error ?? "Invalid code.");
      }
    } catch {
      toast.error("Could not redeem that code.");
    } finally {
      setBusy(false);
    }
  };

  const entries = history.data?.entries ?? [];

  return (
    <AppShell title="Balance">
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-xl font-semibold">Your balance</h1>
          <p className="text-sm text-muted-foreground">Use your USD balance to buy bots in the marketplace.</p>
        </div>

        <section className="panel flex flex-wrap items-center gap-4 p-5">
          <span className="flex size-12 items-center justify-center rounded-xl bg-success/10 text-success">
            <DollarSign className="size-6" aria-hidden="true" />
          </span>
          <div className="mr-auto">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-3xl font-semibold">
              {history.isLoading ? <Loader2 className="size-6 animate-spin" /> : usd(history.data?.balance ?? 0)}
            </p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) closeCheckout(); }}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <Plus className="size-4" aria-hidden="true" /> Top up
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Top up your balance</DialogTitle>
                <DialogDescription>Pay with crypto or redeem a Bottly balance code.</DialogDescription>
              </DialogHeader>

              {checkout ? (
                <CryptoCheckout
                  payment={checkout}
                  onClose={closeCheckout}
                  refreshKeys={[["balance-history"], ["my-balance"]]}
                />
              ) : (
              <>
              <div className="space-y-3">
                <Label>Pay with crypto</Label>
                <div className="flex flex-wrap gap-2">
                  {TOPUP_PRESETS.map((p) => (
                    <Button
                      key={p}
                      type="button"
                      size="sm"
                      variant={amount === p ? "default" : "outline"}
                      onClick={() => setAmount(p)}
                    >
                      {usd(p)}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={MIN_TOPUP_USD}
                    max={MAX_TOPUP_USD}
                    value={amount}
                    aria-label="Custom top-up amount in USD"
                    onChange={(e) => setAmount(Math.round(Number(e.target.value) || 0))}
                  />
                  <Button
                    type="button"
                    className="shrink-0 gap-1.5"
                    disabled={paying || amount < MIN_TOPUP_USD || amount > MAX_TOPUP_USD}
                    onClick={() => void payWithCrypto()}
                  >
                    {paying ? <Loader2 className="size-4 animate-spin" /> : <Bitcoin className="size-4" />} Pay with
                    crypto
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum {usd(MIN_TOPUP_USD)}. Your balance is credited automatically once the payment is confirmed on
                  the blockchain.
                </p>
              </div>

              <div className="space-y-1.5 border-t border-border pt-4">
                <Label htmlFor="topup-code">Balance code</Label>
                <Input
                  id="topup-code"
                  value={code}
                  placeholder="CR-XXXX-XXXX-XXXX"
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && void submit()}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  disabled={busy || !code.trim()}
                  onClick={() => void submit()}
                  className="gap-1.5"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <DollarSign className="size-4" />} Redeem code
                </Button>
              </DialogFooter>
              </>
              )}
            </DialogContent>
          </Dialog>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">History</h2>
          {history.isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No transactions yet. Top up to get started.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <span
                    className={`flex size-8 items-center justify-center rounded-lg bg-elevated ${
                      e.amount >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {e.amount >= 0 ? (
                      <ArrowDownLeft className="size-4" aria-hidden="true" />
                    ) : (
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.label}</p>
                    <p className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</p>
                  </div>
                  <span className={`text-sm font-semibold ${e.amount >= 0 ? "text-success" : "text-destructive"}`}>
                    {e.amount >= 0 ? "+" : "−"}
                    {usd(Math.abs(e.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
