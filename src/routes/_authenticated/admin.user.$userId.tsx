import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ShieldAlert, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProfileBadges } from "@/components/profile/ProfileBadges";
import { MANUAL_BADGES } from "@/lib/badges";
import { amIAdmin } from "@/lib/admin-codes.functions";
import {
  adjustUserBalance,
  getUserDetail,
  setUserAdmin,
  setUserBadge,
  setUserBanned,
  setUserPlan,
} from "@/lib/admin-users.functions";
import type { PlanTier } from "@/lib/plan.functions";
import { usd } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/admin/user/$userId")({
  head: () => ({
    meta: [
      { title: "Account management — Bottly admin" },
      { name: "description", content: "Manage a single Bottly account: plan, balance, badges, bans and admin role." },
      { property: "og:title", content: "Account management — Bottly admin" },
      { property: "og:description", content: "Manage a single Bottly account: plan, balance, badges, bans and admin role." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { userId } = useParams({ from: "/_authenticated/admin/user/$userId" });
  const checkAdmin = useServerFn(amIAdmin);
  const load = useServerFn(getUserDetail);
  const ban = useServerFn(setUserBanned);
  const plan = useServerFn(setUserPlan);
  const admin = useServerFn(setUserAdmin);
  const badge = useServerFn(setUserBadge);
  const adjust = useServerFn(adjustUserBalance);

  const { data: isAdmin, isLoading: checking } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin(),
    staleTime: 5 * 60 * 1000,
  });

  const user = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => load({ data: { userId } }),
    enabled: isAdmin === true,
  });

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      void user.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  if (checking || (isAdmin === true && user.isLoading)) {
    return (
      <AppShell title="Account">
        <div className="flex items-center justify-center p-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Account">
        <div className="mx-auto max-w-md py-20 text-center">
          <ShieldAlert className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">This area is restricted to Bottly administrators.</p>
        </div>
      </AppShell>
    );
  }

  const u = user.data;
  if (!u) {
    return (
      <AppShell title="Account">
        <div className="mx-auto max-w-md py-20 text-center">
          <UserRound className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold">Account not found</h1>
          <Link to="/admin/users" className="mt-3 inline-block text-sm text-primary underline">
            Back to users
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Account">
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
        <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" /> All users
        </Link>

        <header className="panel flex flex-wrap items-center gap-4 p-5">
          <span className="flex size-14 items-center justify-center overflow-hidden rounded-full bg-elevated">
            {u.avatarUrl ? (
              <img src={u.avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <UserRound className="size-6 text-muted-foreground" aria-hidden="true" />
            )}
          </span>
          <div className="mr-auto">
            <h1 className="text-xl font-semibold">{u.displayName}</h1>
            <p className="text-sm text-muted-foreground">
              {u.username ? `@${u.username}` : "no handle"} · {u.email ?? "email hidden"}
            </p>
            <ProfileBadges badges={u.badges} className="mt-2" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="text-success">
              {usd(u.balance)}
            </Badge>
            {u.isAdmin && <Badge variant="secondary">Admin</Badge>}
            {u.banned && <Badge variant="destructive">Banned</Badge>}
          </div>
        </header>

        <section className="panel grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          {[
            ["Bots", u.botCount],
            ["Listings", u.listingCount],
            ["Sales", u.salesCount],
            ["Joined", new Date(u.joinedAt).toLocaleDateString()],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="panel space-y-3 p-5">
          <h2 className="text-sm font-semibold">Badges</h2>
          <p className="text-xs text-muted-foreground">
            Manual badges are granted here. Achievement badges are awarded automatically from bots and sales.
          </p>
          <div className="flex flex-wrap gap-2">
            {MANUAL_BADGES.map((b) => {
              const on = u.badges.includes(b.key);
              return (
                <Button
                  key={b.key}
                  size="sm"
                  variant={on ? "default" : "outline"}
                  title={b.description}
                  onClick={() =>
                    void run(
                      () => badge({ data: { userId: u.id, badge: b.key, granted: !on, note: "" } }),
                      on ? `${b.label} removed` : `${b.label} granted`,
                    )
                  }
                >
                  {b.label}
                </Button>
              );
            })}
          </div>
        </section>

        <section className="panel space-y-4 p-5">
          <h2 className="text-sm font-semibold">Account controls</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={u.plan}
              onValueChange={(v) => void run(() => plan({ data: { userId: u.id, plan: v as PlanTier } }), "Plan updated")}
            >
              <SelectTrigger className="w-36" aria-label="Plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="ultimate">Ultimate</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={u.banned ? "outline" : "destructive"}
              size="sm"
              onClick={() => void run(() => ban({ data: { userId: u.id, banned: !u.banned } }), u.banned ? "User unbanned" : "User banned")}
            >
              {u.banned ? "Unban" : "Ban"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void run(() => admin({ data: { userId: u.id, admin: !u.isAdmin } }), "Role updated")}
            >
              {u.isAdmin ? "Remove admin" : "Make admin"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input className="w-32" placeholder="+/- USD" aria-label="Balance adjustment" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Input className="w-56" placeholder="Reason" aria-label="Adjustment reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const dollars = Number(amount);
                if (!Number.isFinite(dollars) || dollars === 0) {
                  toast.error("Enter an amount in USD");
                  return;
                }
                void run(async () => {
                  const res = await adjust({
                    data: { userId: u.id, amount: Math.round(dollars * 100), reason: reason || "Admin adjustment" },
                  });
                  if (!res.ok) throw new Error(res.error ?? "Adjustment failed");
                  setAmount("");
                  setReason("");
                }, "Balance updated");
              }}
            >
              Apply balance
            </Button>
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Balance history</h2>
          {u.adjustments.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No admin adjustments yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border text-sm">
              {u.adjustments.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2">
                  <span className={a.amount >= 0 ? "font-medium text-success" : "font-medium text-destructive"}>
                    {a.amount >= 0 ? "+" : "-"}
                    {usd(Math.abs(a.amount))}
                  </span>
                  <span className="mr-auto text-muted-foreground">{a.reason || "Admin adjustment"}</span>
                  <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
