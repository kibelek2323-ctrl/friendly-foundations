import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Gift, Loader2, Save } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminGetReferrals, adminSaveReferralSettings } from "@/lib/referrals.functions";
import { usd } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/admin/referrals")({
  head: () => ({
    meta: [
      { title: "Referrals — Bottly admin" },
      { name: "description", content: "Tune referral bonuses and review who invited whom." },
      { property: "og:title", content: "Referrals — Bottly admin" },
      { property: "og:description", content: "Tune referral bonuses and review who invited whom." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const fetchAll = useServerFn(adminGetReferrals);
  const saveSettings = useServerFn(adminSaveReferralSettings);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["admin-referrals"], queryFn: () => fetchAll() });

  const [referrerBonus, setReferrerBonus] = useState(2);
  const [refereeBonus, setRefereeBonus] = useState(1);
  const [minSpend, setMinSpend] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setReferrerBonus(data.settings.referrerBonus / 100);
    setRefereeBonus(data.settings.refereeBonus / 100);
    setMinSpend(data.settings.minSpend / 100);
  }, [data]);

  const save = async () => {
    setBusy(true);
    try {
      const res = await saveSettings({
        data: {
          referrerBonus: Math.round(referrerBonus * 100),
          refereeBonus: Math.round(refereeBonus * 100),
          minSpend: Math.round(minSpend * 100),
        },
      });
      if (!res.ok) {
        toast.error(res.error ?? "Could not save the settings.");
        return;
      }
      toast.success("Referral settings saved.");
      void refetch();
    } catch {
      toast.error("Could not save the settings.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Referrals">
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Gift className="size-5 text-success" aria-hidden="true" /> Referral programme
          </h1>
          <p className="text-sm text-muted-foreground">Set the bonuses and watch how invitations convert.</p>
        </div>

        <section className="panel space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="r-referrer">Inviter bonus (USD)</Label>
              <Input
                id="r-referrer"
                type="number"
                min={0}
                step="0.5"
                value={referrerBonus}
                onChange={(e) => setReferrerBonus(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-referee">New user bonus (USD)</Label>
              <Input
                id="r-referee"
                type="number"
                min={0}
                step="0.5"
                value={refereeBonus}
                onChange={(e) => setRefereeBonus(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-min">Unlock after spending (USD)</Label>
              <Input
                id="r-min"
                type="number"
                min={0}
                step="0.5"
                value={minSpend}
                onChange={(e) => setMinSpend(Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <Button className="gap-1.5" disabled={busy} onClick={() => void save()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" aria-hidden="true" />} Save settings
          </Button>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Recent referrals</h2>
          <div className="panel divide-y divide-border">
            {isLoading && (
              <div className="flex justify-center p-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
              </div>
            )}
            {(data?.rows ?? []).map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="mr-auto min-w-0">
                  <p className="truncate font-medium">
                    {r.referrerName} → {r.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</p>
                </div>
                {r.rewardAmount > 0 && <span className="text-sm font-medium text-success">{usd(r.rewardAmount)}</span>}
                <Badge variant={r.status === "rewarded" ? "default" : "secondary"}>{r.status}</Badge>
              </div>
            ))}
            {!isLoading && (data?.rows ?? []).length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">No referrals yet.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
