import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldAlert } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { amIAdmin } from "@/lib/admin-codes.functions";
import { getAdminStats } from "@/lib/admin-stats.functions";
import { usd } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/admin/stats")({
  head: () => ({
    meta: [
      { title: "Platform stats — Bottly" },
      { name: "description", content: "Signups, bots, marketplace sales and revenue across Bottly." },
      { property: "og:title", content: "Platform stats — Bottly" },
      { property: "og:description", content: "Signups, bots, marketplace sales and revenue across Bottly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

const axis = { stroke: "hsl(var(--muted-foreground))", fontSize: 11 } as const;

function Page() {
  const checkAdmin = useServerFn(amIAdmin);
  const load = useServerFn(getAdminStats);

  const { data: isAdmin, isLoading: checking } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin(),
    staleTime: 5 * 60 * 1000,
  });

  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => load(), enabled: isAdmin === true });

  if (checking || (isAdmin && stats.isLoading)) {
    return (
      <AppShell title="Platform stats">
        <div className="flex items-center justify-center p-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Platform stats">
        <div className="mx-auto max-w-md py-20 text-center">
          <ShieldAlert className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">This area is restricted to Bottly administrators.</p>
        </div>
      </AppShell>
    );
  }

  const d = stats.data;

  return (
    <AppShell title="Platform stats">
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-xl font-semibold">Platform stats</h1>
          <p className="text-sm text-muted-foreground">Last 30 days of activity across Bottly.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Users" value={String(d?.totals.users ?? 0)} />
          <Stat label="Bots" value={String(d?.totals.bots ?? 0)} />
          <Stat label="Listings" value={String(d?.totals.listings ?? 0)} />
          <Stat label="Purchases" value={String(d?.totals.purchases ?? 0)} />
          <Stat label="Revenue" value={usd(d?.totals.revenue ?? 0)} />
          <Stat label="Open reports" value={String(d?.totals.openReports ?? 0)} />
        </div>

        <section className="panel p-4">
          <h2 className="mb-3 text-sm font-medium">New signups</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d?.signupsByDay ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={axis} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis allowDecimals={false} tick={axis} width={28} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-4">
          <h2 className="mb-3 text-sm font-medium">Bots created</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d?.botsByDay ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={axis} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis allowDecimals={false} tick={axis} width={28} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-4">
          <h2 className="mb-3 text-sm font-medium">Marketplace sales</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d?.salesByDay ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={axis} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis allowDecimals={false} tick={axis} width={28} />
                <Tooltip formatter={(value: number, name: string) => (name === "revenue" ? usd(value) : value)} />
                <Bar dataKey="count" fill="var(--color-success)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel p-4">
          <h2 className="mb-3 text-sm font-medium">Plans</h2>
          <ul className="grid gap-2 sm:grid-cols-3">
            {(d?.planBreakdown ?? []).map((p) => (
              <li key={p.plan} className="rounded-md border border-border p-3">
                <p className="text-xs capitalize text-muted-foreground">{p.plan}</p>
                <p className="text-lg font-semibold">{p.count}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
