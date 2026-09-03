import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Coins, KeyRound, Loader2, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { redeemPlanCode } from "@/lib/plan.functions";
import { getMyBalance, redeemBalanceCode } from "@/lib/marketplace.functions";
import { useQuery } from "@tanstack/react-query";
import { usePlan } from "@/hooks/usePlan";
import { PLAN_LABEL, PLAN_LIMITS, limitLabel } from "@/data/plan-limits";
import type { PlanId } from "@/types/bot";
import { usd } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Plan & activation code — Bottly" },
      { name: "description", content: "Check your Bottly plan, usage limits and activate a new plan with a code." },
      { property: "og:title", content: "Plan & activation code — Bottly" },
      { property: "og:description", content: "Check your Bottly plan, usage limits and activate a new plan with a code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function UsageBar({ label, used, max }: { label: string; used: number; max: number | null }) {
  const pct = max === null ? 0 : Math.min(100, Math.round((used / Math.max(1, max)) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {used} / {limitLabel(max)}
        </span>
      </div>
      <Progress value={max === null ? 100 : pct} />
    </div>
  );
}

function Page() {
  const { plan, limits, data, isLoading, botCount, aiUsedToday, refetch } = usePlan();
  const redeem = useServerFn(redeemPlanCode);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);


  const submit = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const res = await redeem({ data: { code: code.trim() } });
      if (res.ok) {
        toast.success(`Plan ${PLAN_LABEL[(res.plan ?? "free") as PlanId]} aktywowany!`);
        setCode("");
        refetch();
      } else {
        toast.error(res.error ?? "Invalid code.");
      }
    } catch {
      toast.error("Could not redeem that code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Plan">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-xl font-semibold">Your plan</h1>
          <p className="text-sm text-muted-foreground">
            Plans are tied to your account and activated with a code — not to individual bots.
          </p>
        </div>

        <section className="panel space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">{PLAN_LABEL[plan]}</h2>
                {isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />}
              </div>
              <p className="text-xs text-muted-foreground">
                {data?.expiresAt
                  ? `Active until ${new Date(data.expiresAt).toLocaleDateString()}`
                  : plan === "free"
                    ? "No active code — free tier limits apply"
                    : "Active indefinitely"}
              </p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {plan}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <UsageBar label="Bots" used={botCount} max={limits.bots} />
            <UsageBar label="AI messages today" used={aiUsedToday} max={limits.aiPerDay} />
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">Commands per bot</p>
              <p className="text-sm font-medium">{limitLabel(limits.commands)}</p>
              <p className="text-xs text-muted-foreground">
                Branding & description: {limits.branding ? "unlocked" : "locked (Pro)"}
              </p>
            </div>
          </div>
        </section>

        <section className="panel space-y-3 p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Activate a code</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Got a Bottly plan code? Enter it here to upgrade your account instantly.
          </p>
          <div className="flex flex-wrap gap-2">
            <div className="min-w-52 flex-1 space-y-1.5">
              <Label htmlFor="plan-code" className="sr-only">
                Plan code
              </Label>
              <Input
                id="plan-code"
                value={code}
                placeholder="PRO-XXXX-XXXX-XXXX"
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
              />
            </div>
            <Button className="gap-1.5" disabled={busy || !code.trim()} onClick={() => void submit()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Activate
            </Button>
          </div>
        </section>


        <section className="grid gap-4 md:grid-cols-3">
          {(Object.keys(PLAN_LIMITS) as PlanId[]).map((id) => (
            <div key={id} className={`panel p-5 ${id === plan ? "border-primary ring-1 ring-primary" : ""}`}>
              <p className="text-sm font-semibold">{PLAN_LABEL[id]}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                <li>{limitLabel(PLAN_LIMITS[id].bots)} bots</li>
                <li>{limitLabel(PLAN_LIMITS[id].commands)} commands per bot</li>
                <li>{PLAN_LIMITS[id].aiPerDay} AI messages / day</li>
                <li>{PLAN_LIMITS[id].branding ? "Description & branding editing" : "No branding editing"}</li>
              </ul>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
