import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Gift, Loader2, MousePointerClick, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyReferralCode, getMyReferrals } from "@/lib/referrals.functions";
import { usd } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/referrals")({
  head: () => ({
    meta: [
      { title: "Invite friends — Bottly referrals" },
      { name: "description", content: "Share your Bottly referral link and earn account credit when friends start building bots." },
      { property: "og:title", content: "Invite friends — Bottly referrals" },
      { property: "og:description", content: "Share your Bottly referral link and earn account credit when friends start building bots." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const fetchReferrals = useServerFn(getMyReferrals);
  const applyCode = useServerFn(applyReferralCode);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["my-referrals"], queryFn: () => fetchReferrals() });

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const saveMyCode = useServerFn(setMyReferralCode);
  const [custom, setCustom] = useState("");
  const [savingCode, setSavingCode] = useState(false);

  useEffect(() => {
    if (data?.code) setCustom(data.code);
  }, [data?.code]);

  const saveCode = async () => {
    setSavingCode(true);
    try {
      const res = await saveMyCode({ data: { code: custom } });
      if (!res.ok) {
        toast.error(res.error ?? "Could not save that code.");
        return;
      }
      toast.success("Referral code updated.");
      void refetch();
    } catch {
      toast.error("Could not save that code.");
    } finally {
      setSavingCode(false);
    }
  };

  const link = data ? `https://bottly.xyz/register?ref=${data.code}` : "";

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied.`);
    } catch {
      toast.error("Could not copy.");
    }
  };

  const redeem = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const res = await applyCode({ data: { code: code.trim() } });
      if (!res.ok) {
        toast.error(res.error ?? "Could not apply that code.");
        return;
      }
      toast.success(res.bonus ? `Welcome bonus of ${usd(res.bonus)} added.` : "Referral applied.");
      setCode("");
      void refetch();
    } catch {
      toast.error("Could not apply that code.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Referrals">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-xl font-semibold">Invite friends, earn credit</h1>
          <p className="text-sm text-muted-foreground">
            {data
              ? `They get ${usd(data.settings.refereeBonus)} on sign-up, you get ${usd(data.settings.referrerBonus)} once they spend ${usd(data.settings.minSpend)}.`
              : "Share your link and earn credit when friends start building."}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : (
          <>
            <section className="panel space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="r-code">Your code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="r-code"
                      value={custom}
                      onChange={(e) => setCustom(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                      maxLength={24}
                      className="font-mono"
                      aria-label="Your referral code"
                    />
                    <Button variant="outline" size="icon" aria-label="Copy code" onClick={() => void copy(data?.code ?? "", "Code")}>
                      <Copy className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={savingCode || custom.length < 3 || custom === data?.code}
                      onClick={() => void saveCode()}
                    >
                      {savingCode ? <Loader2 className="size-4 animate-spin" /> : "Save custom code"}
                    </Button>
                    <p className="text-xs text-muted-foreground">3–24 letters, numbers, - or _</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-link">Your link</Label>
                  <div className="flex gap-2">
                    <Input id="r-link" readOnly value={link} />
                    <Button variant="outline" size="icon" aria-label="Copy link" onClick={() => void copy(link, "Link")}>
                      <Copy className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <MousePointerClick className="size-4 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-muted-foreground">Link clicks</p>
                    <p className="font-semibold">{data?.clicks ?? 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Users className="size-4 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-muted-foreground">Friends joined</p>
                    <p className="font-semibold">{data?.invited.length ?? 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Gift className="size-4 text-success" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-muted-foreground">Earned</p>
                    <p className="font-semibold">{usd(data?.earned ?? 0)}</p>
                  </div>
                </div>
              </div>
            </section>

            {!data?.usedCode && (
              <section className="panel space-y-3 p-5">
                <div>
                  <h2 className="text-sm font-semibold">Got invited?</h2>
                  <p className="text-xs text-muted-foreground">Enter a friend's code to claim your welcome bonus.</p>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Referral code"
                    aria-label="Referral code"
                    className="max-w-xs font-mono"
                  />
                  <Button disabled={busy || !code.trim()} onClick={() => void redeem()}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
              </section>
            )}

            <section className="space-y-3">
              <h2 className="text-sm font-semibold">Your invites</h2>
              <div className="panel divide-y divide-border">
                {(data?.invited ?? []).map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="mr-auto min-w-0">
                      <p className="truncate font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    {r.rewardAmount > 0 && <span className="text-sm font-medium text-success">+{usd(r.rewardAmount)}</span>}
                    <Badge variant={r.status === "rewarded" ? "default" : "secondary"}>{r.status}</Badge>
                  </div>
                ))}
                {(data?.invited ?? []).length === 0 && (
                  <p className="p-8 text-center text-sm text-muted-foreground">No one has joined with your link yet.</p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
