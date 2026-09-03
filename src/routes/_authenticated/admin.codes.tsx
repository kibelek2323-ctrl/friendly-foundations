import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck, Copy, Loader2, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { usd } from "@/lib/money";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  amIAdmin,
  createBalanceCodes,
  createPlanCodes,
  deactivatePlanCode,
  listBalanceCodes,
  listPlanCodes,
  setBalanceCodeActive,
  createDiscountCodes,
  listDiscountCodes,
  setDiscountCodeActive,
  listCreators,
  setCreatorVerified,
} from "@/lib/admin-codes.functions";
import type { PlanTier } from "@/lib/plan.functions";

export const Route = createFileRoute("/_authenticated/admin/codes")({
  head: () => ({
    meta: [
      { title: "Plan codes admin — Bottly" },
      { name: "description", content: "Generate and manage Bottly plan activation codes." },
      { property: "og:title", content: "Plan codes admin — Bottly" },
      { property: "og:description", content: "Generate and manage Bottly plan activation codes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const checkAdmin = useServerFn(amIAdmin);
  const list = useServerFn(listPlanCodes);
  const create = useServerFn(createPlanCodes);
  const toggle = useServerFn(deactivatePlanCode);
  const listBal = useServerFn(listBalanceCodes);
  const createBal = useServerFn(createBalanceCodes);
  const toggleBal = useServerFn(setBalanceCodeActive);

  const { data: isAdmin, isLoading: checking } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin(),
    staleTime: 5 * 60 * 1000,
  });

  const codes = useQuery({
    queryKey: ["plan-codes"],
    queryFn: () => list(),
    enabled: isAdmin === true,
  });

  const [plan, setPlan] = useState<PlanTier>("pro");
  const [quantity, setQuantity] = useState(1);
  const [durationDays, setDurationDays] = useState<string>("30");
  const [maxUses, setMaxUses] = useState(1);
  const [busy, setBusy] = useState(false);

  const balCodes = useQuery({
    queryKey: ["balance-codes"],
    queryFn: () => listBal(),
    enabled: isAdmin === true,
  });
  const [amount, setAmount] = useState(100);
  const [balQuantity, setBalQuantity] = useState(1);
  const [balMaxUses, setBalMaxUses] = useState(1);
  const [balBusy, setBalBusy] = useState(false);

  const listDisc = useServerFn(listDiscountCodes);
  const createDisc = useServerFn(createDiscountCodes);
  const toggleDisc = useServerFn(setDiscountCodeActive);
  const listCr = useServerFn(listCreators);
  const setVerified = useServerFn(setCreatorVerified);

  const discCodes = useQuery({ queryKey: ["discount-codes"], queryFn: () => listDisc(), enabled: isAdmin === true });
  const creators = useQuery({ queryKey: ["admin-creators"], queryFn: () => listCr(), enabled: isAdmin === true });
  const [percent, setPercent] = useState(10);
  const [discQuantity, setDiscQuantity] = useState(1);
  const [discMaxUses, setDiscMaxUses] = useState(1);
  const [discBusy, setDiscBusy] = useState(false);

  const generateDiscount = async () => {
    setDiscBusy(true);
    try {
      const res = await createDisc({
        data: { percent, quantity: discQuantity, maxUses: discMaxUses, listingId: null, expiresAt: null },
      });
      toast.success(`Generated ${res.codes.length} discount code(s)`);
      void discCodes.refetch();
    } catch {
      toast.error("Could not generate discount codes");
    } finally {
      setDiscBusy(false);
    }
  };

  const generateBalance = async () => {
    setBalBusy(true);
    try {
      const res = await createBal({
        data: { amount, quantity: balQuantity, maxUses: balMaxUses, expiresAt: null },
      });
      toast.success(`Generated ${res.codes.length} balance code(s)`);
      void balCodes.refetch();
    } catch {
      toast.error("Could not generate balance codes");
    } finally {
      setBalBusy(false);
    }
  };

  const generate = async () => {
    setBusy(true);
    try {
      const res = await create({
        data: {
          plan,
          quantity,
          durationDays: durationDays.trim() === "" ? null : Number(durationDays),
          maxUses,
          expiresAt: null,
        },
      });
      toast.success(`Generated ${res.codes.length} code(s)`);
      void codes.refetch();
    } catch {
      toast.error("Could not generate codes");
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <AppShell title="Plan codes">
        <div className="flex items-center justify-center p-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Plan codes">
        <div className="mx-auto max-w-md py-20 text-center">
          <ShieldAlert className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">This area is restricted to Bottly administrators.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Plan codes">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-xl font-semibold">Plan codes</h1>
          <p className="text-sm text-muted-foreground">Generate activation codes users can redeem on the Plan page.</p>
        </div>

        <section className="panel grid gap-4 p-5 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-plan">Plan</Label>
            <Select value={plan} onValueChange={(v) => setPlan(v as PlanTier)}>
              <SelectTrigger id="c-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="ultimate">Ultimate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-qty">Quantity</Label>
            <Input id="c-qty" type="number" min={1} max={50} value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 1)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-days">Days (empty = forever)</Label>
            <Input id="c-days" value={durationDays} onChange={(e) => setDurationDays(e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-uses">Max uses</Label>
            <Input id="c-uses" type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value) || 1)} />
          </div>
          <div className="sm:col-span-4">
            <Button disabled={busy} onClick={() => void generate()} className="gap-1.5">
              {busy && <Loader2 className="size-4 animate-spin" />} Generate codes
            </Button>
          </div>
        </section>

        <section className="panel divide-y divide-border">
          {codes.isLoading && (
            <div className="flex justify-center p-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          {(codes.data ?? []).map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
              <code className="font-mono text-sm">{c.code}</code>
              <Badge variant="secondary" className="capitalize">
                {c.plan}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {c.usedCount}/{c.maxUses} used · {c.durationDays ? `${c.durationDays} days` : "forever"}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Copy ${c.code}`}
                  onClick={() => {
                    void navigator.clipboard.writeText(c.code);
                    toast.success("Code copied");
                  }}
                >
                  <Copy className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await toggle({ data: { id: c.id, active: !c.active } });
                    void codes.refetch();
                  }}
                >
                  {c.active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          ))}
          {!codes.isLoading && (codes.data ?? []).length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No codes generated yet.</p>
          )}
        </section>

        <div>
          <h2 className="text-lg font-semibold">Balance codes</h2>
          <p className="text-sm text-muted-foreground">Generate codes that top up a user's marketplace balance.</p>
        </div>

        <section className="panel grid gap-4 p-5 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="b-amount">Amount (USD)</Label>
            <Input id="b-amount" type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 1)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-qty">Quantity</Label>
            <Input id="b-qty" type="number" min={1} max={50} value={balQuantity} onChange={(e) => setBalQuantity(Number(e.target.value) || 1)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-uses">Max uses</Label>
            <Input id="b-uses" type="number" min={1} value={balMaxUses} onChange={(e) => setBalMaxUses(Number(e.target.value) || 1)} />
          </div>
          <div className="sm:col-span-4">
            <Button disabled={balBusy} onClick={() => void generateBalance()} className="gap-1.5">
              {balBusy && <Loader2 className="size-4 animate-spin" />} Generate balance codes
            </Button>
          </div>
        </section>

        <section className="panel divide-y divide-border">
          {balCodes.isLoading && (
            <div className="flex justify-center p-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          {(balCodes.data ?? []).map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
              <code className="font-mono text-sm">{c.code}</code>
              <Badge variant="secondary">{usd(c.amount)}</Badge>
              <span className="text-xs text-muted-foreground">
                {c.usedCount}/{c.maxUses} used
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Copy ${c.code}`}
                  onClick={() => {
                    void navigator.clipboard.writeText(c.code);
                    toast.success("Code copied");
                  }}
                >
                  <Copy className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await toggleBal({ data: { id: c.id, active: !c.active } });
                    void balCodes.refetch();
                  }}
                >
                  {c.active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          ))}
          {!balCodes.isLoading && (balCodes.data ?? []).length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No balance codes generated yet.</p>
          )}
        </section>

        <div>
          <h2 className="text-lg font-semibold">Marketplace discount codes</h2>
          <p className="text-sm text-muted-foreground">Percentage-off codes buyers can apply at checkout.</p>
        </div>

        <section className="panel grid gap-4 p-5 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="d-percent">Discount (%)</Label>
            <Input id="d-percent" type="number" min={1} max={100} value={percent} onChange={(e) => setPercent(Number(e.target.value) || 1)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-qty">Quantity</Label>
            <Input id="d-qty" type="number" min={1} max={50} value={discQuantity} onChange={(e) => setDiscQuantity(Number(e.target.value) || 1)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d-uses">Max uses</Label>
            <Input id="d-uses" type="number" min={1} value={discMaxUses} onChange={(e) => setDiscMaxUses(Number(e.target.value) || 1)} />
          </div>
          <div className="sm:col-span-4">
            <Button disabled={discBusy} onClick={() => void generateDiscount()} className="gap-1.5">
              {discBusy && <Loader2 className="size-4 animate-spin" />} Generate discount codes
            </Button>
          </div>
        </section>

        <section className="panel divide-y divide-border">
          {discCodes.isLoading && (
            <div className="flex justify-center p-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          {(discCodes.data ?? []).map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
              <code className="font-mono text-sm">{c.code}</code>
              <Badge variant="secondary">-{c.percent}%</Badge>
              <span className="text-xs text-muted-foreground">
                {c.usedCount}/{c.maxUses} used{c.listingTitle ? ` · ${c.listingTitle}` : " · any listing"}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Copy ${c.code}`}
                  onClick={() => {
                    void navigator.clipboard.writeText(c.code);
                    toast.success("Code copied");
                  }}
                >
                  <Copy className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await toggleDisc({ data: { id: c.id, active: !c.active } });
                    void discCodes.refetch();
                  }}
                >
                  {c.active ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </div>
          ))}
          {!discCodes.isLoading && (discCodes.data ?? []).length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No discount codes yet.</p>
          )}
        </section>

        <div>
          <h2 className="text-lg font-semibold">Creator verification</h2>
          <p className="text-sm text-muted-foreground">Verified creators get a badge on their listings and profile.</p>
        </div>

        <section className="panel divide-y divide-border">
          {creators.isLoading && (
            <div className="flex justify-center p-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          {(creators.data ?? []).map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {c.displayName}
                {c.verified && <BadgeCheck className="size-4 text-primary" aria-label="Verified" />}
              </span>
              <span className="text-xs text-muted-foreground">
                {c.username ? `@${c.username}` : "no handle"} · {c.listingCount} listings
              </span>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={async () => {
                  await setVerified({ data: { userId: c.id, verified: !c.verified } });
                  void creators.refetch();
                }}
              >
                {c.verified ? "Remove verification" : "Verify creator"}
              </Button>
            </div>
          ))}
          {!creators.isLoading && (creators.data ?? []).length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No creators yet.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
