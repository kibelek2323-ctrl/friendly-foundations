import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BarChart3, Banknote, Eye, Heart, Loader2, ShoppingBag, Store } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCreatorStats } from "@/lib/marketplace.functions";
import { myPayouts, requestPayout, PAYOUT_METHODS } from "@/lib/payouts.functions";
import { usd } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/payouts")({
  head: () => ({
    meta: [
      { title: "Creator earnings & payouts — Bottly" },
      { name: "description", content: "Track your marketplace views, sales and revenue, and cash out your Bottly balance." },
      { property: "og:title", content: "Creator earnings & payouts — Bottly" },
      { property: "og:description", content: "Track your marketplace views, sales and revenue, and cash out your Bottly balance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const METHOD_LABELS: Record<string, string> = { paypal: "PayPal", crypto: "Crypto wallet", bank: "Bank transfer" };

function Stat({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string }) {
  return (
    <div className="panel flex items-center gap-3 p-4">
      <span className="flex size-9 items-center justify-center rounded-lg bg-elevated text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}

function Page() {
  const fetchStats = useServerFn(getCreatorStats);
  const fetchPayouts = useServerFn(myPayouts);
  const submitPayout = useServerFn(requestPayout);

  const stats = useQuery({ queryKey: ["creator-stats"], queryFn: () => fetchStats() });
  const payouts = useQuery({ queryKey: ["my-payouts"], queryFn: () => fetchPayouts() });

  const [amount, setAmount] = useState(10);
  const [method, setMethod] = useState<(typeof PAYOUT_METHODS)[number]>("paypal");
  const [destination, setDestination] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (destination.trim().length < 3) {
      toast.error("Add where we should send the money.");
      return;
    }
    setBusy(true);
    try {
      const res = await submitPayout({
        data: { amount: Math.round(amount * 100), method, destination: destination.trim() },
      });
      if (!res.ok) {
        toast.error(res.error ?? "Could not submit the payout request.");
        return;
      }
      toast.success("Payout requested — we'll review it shortly.");
      setDestination("");
      void payouts.refetch();
      void stats.refetch();
    } catch {
      toast.error("Could not submit the payout request.");
    } finally {
      setBusy(false);
    }
  };

  const s = stats.data;

  return (
    <AppShell title="Earnings">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-xl font-semibold">Creator earnings</h1>
          <p className="text-sm text-muted-foreground">How your listings perform and how to cash out your balance.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat icon={Store} label="Listings" value={String(s?.listingCount ?? 0)} />
          <Stat icon={Eye} label="Views" value={String(s?.totalViews ?? 0)} />
          <Stat icon={ShoppingBag} label="Sales" value={String(s?.totalSales ?? 0)} />
          <Stat icon={BarChart3} label="Revenue" value={usd(s?.revenue ?? 0)} />
          <Stat icon={Heart} label="Saves" value={String(s?.favorites ?? 0)} />
          <Stat icon={Banknote} label="Pending payouts" value={usd(s?.pendingPayout ?? 0)} />
        </div>

        <section className="panel space-y-4 p-5">
          <div>
            <h2 className="text-sm font-semibold">Request a payout</h2>
            <p className="text-xs text-muted-foreground">Minimum $10. The amount is held from your balance until we process it.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-amount">Amount (USD)</Label>
              <Input id="p-amount" type="number" min={10} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-method">Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                <SelectTrigger id="p-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYOUT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-dest">Send to</Label>
              <Input
                id="p-dest"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </div>
          <Button className="gap-1.5" disabled={busy} onClick={() => void submit()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Banknote className="size-4" aria-hidden="true" />}
            Request payout
          </Button>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Payout history</h2>
          <div className="panel divide-y divide-border">
            {payouts.isLoading && (
              <div className="flex justify-center p-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
              </div>
            )}
            {(payouts.data ?? []).map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="mr-auto min-w-0">
                  <p className="font-medium">{usd(p.amount)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {METHOD_LABELS[p.method] ?? p.method} · {p.destination} · {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                  {p.note && <p className="text-xs text-muted-foreground">{p.note}</p>}
                </div>
                <Badge variant={p.status === "paid" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                  {p.status}
                </Badge>
              </div>
            ))}
            {!payouts.isLoading && (payouts.data ?? []).length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">No payouts requested yet.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
