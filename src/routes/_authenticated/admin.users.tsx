import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck, FlaskConical, Loader2, ShieldAlert, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { amIAdmin } from "@/lib/admin-codes.functions";
import { adjustUserBalance, listUsers, setUserAdmin, setUserBanned, setUserPlan } from "@/lib/admin-users.functions";
import type { PlanTier } from "@/lib/plan.functions";
import { usd } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({
    meta: [
      { title: "User management — Bottly" },
      { name: "description", content: "Manage Bottly accounts: plans, balances, bans and admin roles." },
      { property: "og:title", content: "User management — Bottly" },
      { property: "og:description", content: "Manage Bottly accounts: plans, balances, bans and admin roles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const checkAdmin = useServerFn(amIAdmin);
  const load = useServerFn(listUsers);
  const ban = useServerFn(setUserBanned);
  const plan = useServerFn(setUserPlan);
  const admin = useServerFn(setUserAdmin);
  const adjust = useServerFn(adjustUserBalance);

  const { data: isAdmin, isLoading: checking } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin(),
    staleTime: 5 * 60 * 1000,
  });

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const users = useQuery({
    queryKey: ["admin-users", query],
    queryFn: () => load({ data: { search: query } }),
    enabled: isAdmin === true,
  });

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      void users.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  if (checking) {
    return (
      <AppShell title="Users">
        <div className="flex items-center justify-center p-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Users">
        <div className="mx-auto max-w-md py-20 text-center">
          <ShieldAlert className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">This area is restricted to Bottly administrators.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Users">
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Users className="size-5 text-muted-foreground" aria-hidden="true" /> User management
          </h1>
          <p className="text-sm text-muted-foreground">Plans, balances, bans and admin roles.</p>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(search.trim());
          }}
        >
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or @username" aria-label="Search users" />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>

        <section className="panel divide-y divide-border">
          {users.isLoading && (
            <div className="flex justify-center p-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          {(users.data ?? []).map((u) => (
            <article key={u.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {u.displayName}
                  {u.verified && <BadgeCheck className="size-4 text-primary" aria-label="Verified" />}
                </span>
                <span className="text-xs text-muted-foreground">
                  {u.username ? `@${u.username}` : "no handle"} · {u.botCount} bots · joined{" "}
                  {new Date(u.joinedAt).toLocaleDateString()}
                </span>
                {u.isAdmin && <Badge variant="secondary">Admin</Badge>}
                {u.banned && <Badge variant="destructive">Banned</Badge>}
                <Badge variant="outline" className="ml-auto text-success">
                  {usd(u.balance)}
                </Badge>
                <Button asChild variant="outline" size="icon" title={`Manage ${u.displayName}`}>
                  <Link to="/admin/user/$userId" params={{ userId: u.id }} aria-label={`Manage ${u.displayName}`}>
                    <FlaskConical className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={u.plan} onValueChange={(v) => void run(() => plan({ data: { userId: u.id, plan: v as PlanTier } }), "Plan updated")}>
                  <SelectTrigger className="w-32" aria-label={`Plan for ${u.displayName}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="ultimate">Ultimate</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  className="w-32"
                  placeholder="+/- USD"
                  aria-label={`Balance adjustment for ${u.displayName}`}
                  value={amounts[u.id] ?? ""}
                  onChange={(e) => setAmounts((a) => ({ ...a, [u.id]: e.target.value }))}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const dollars = Number(amounts[u.id]);
                    if (!Number.isFinite(dollars) || dollars === 0) {
                      toast.error("Enter an amount in USD");
                      return;
                    }
                    void run(async () => {
                      const res = await adjust({
                        data: { userId: u.id, amount: Math.round(dollars * 100), reason: "Admin adjustment" },
                      });
                      if (!res.ok) throw new Error(res.error ?? "Adjustment failed");
                      setAmounts((a) => ({ ...a, [u.id]: "" }));
                    }, "Balance updated");
                  }}
                >
                  Apply balance
                </Button>

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
            </article>
          ))}
          {!users.isLoading && (users.data ?? []).length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No users found.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
