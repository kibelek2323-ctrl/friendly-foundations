import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Bot as BotIcon, Plus, Server, Terminal, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusDot } from "@/components/common/StatusDot";
import { DiscordConnectButton } from "@/components/discord/DiscordConnectButton";
import { DiscordServerPicker } from "@/components/discord/DiscordServerPicker";
import { getDiscordConnection } from "@/lib/discord.functions";
import { useBotStore } from "@/stores/useBotStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useHydrated } from "@/hooks/useHydrated";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Bottly" },
      { name: "description", content: "Track your Discord bots, servers reached, commands and recent activity." },
      { property: "og:title", content: "Dashboard — Bottly" },
      { property: "og:description", content: "Track your Discord bots, servers reached, commands and recent activity." },
    ],
  }),
  component: Page,
});

function Page() {
  const hydrated = useHydrated();
  const bots = useBotStore((s) => s.bots);
  const user = useAuthStore((s) => s.user);
  const getConnection = useServerFn(getDiscordConnection);

  const { data: connectionData } = useQuery({
    queryKey: ["discord-connection"],
    queryFn: () => getConnection(),
    enabled: hydrated,
  });

  const stats = [
    { label: "Bots", value: bots.length, icon: BotIcon },
    { label: "Servers", value: bots.reduce((a, b) => a + b.servers, 0), icon: Server },
    { label: "Members reached", value: bots.reduce((a, b) => a + b.members, 0), icon: Users },
    { label: "Commands", value: bots.reduce((a, b) => a + b.commands.length, 0), icon: Terminal },
  ];

  const activity = bots
    .flatMap((b) => b.logs.map((l) => ({ ...l, botName: b.name, botId: b.id })))
    .sort((a, z) => z.timestamp.localeCompare(a.timestamp))
    .slice(0, 8);

  return (
    <AppShell title="Dashboard">
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">
              Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""} 👋
            </h1>
            <p className="text-sm text-muted-foreground">Here's what your bots have been up to.</p>
          </div>
          <Button asChild className="gap-1.5">
            <Link to="/bots/new">
              <Plus className="size-4" /> New bot
            </Link>
          </Button>
        </div>

        {!hydrated ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <section className="panel flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <h2 className="text-sm font-semibold">Discord connection</h2>
                <p className="text-xs text-muted-foreground">
                  {connectionData?.connection
                    ? `Linked as @${connectionData.connection.username}`
                    : "Connect your Discord account to import real servers, channels and roles."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {connectionData?.connection && (
                  <DiscordServerPicker
                    onSelect={({ guild, channels, roles }) => {
                      toast.success(`Imported ${guild.name}`, {
                        description: `${channels.length} channels · ${roles.length} roles available as variables.`,
                      });
                    }}
                  />
                )}
                <DiscordConnectButton connection={connectionData?.connection} />
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="panel flex items-center gap-4 p-5">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-elevated text-primary">
                    <s.icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                    <p className="text-2xl font-semibold">{s.value.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <section>
                <h2 className="mb-3 text-sm font-semibold">Your bots</h2>
                {bots.length === 0 ? (
                  <EmptyState
                    icon={BotIcon}
                    title="No bots yet."
                    description="Spin up your first Discord bot in a couple of minutes."
                  />
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {bots.slice(0, 6).map((b) => (
                      <li key={b.id}>
                        <Link
                          to="/bots/$botId"
                          params={{ botId: b.id }}
                          className="panel flex items-center gap-3 p-4 transition hover:border-primary/60"
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-xs font-semibold text-primary-foreground">
                            {b.avatar ? <img src={b.avatar} alt="" className="size-full object-cover" /> : b.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{b.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {b.servers} servers · {b.commands.length} commands
                            </span>
                          </span>
                          <StatusDot status={b.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h2 className="mb-3 text-sm font-semibold">Recent activity</h2>
                <ul className="panel divide-y divide-border">
                  {activity.map((l) => (
                    <li key={l.id} className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Activity className="size-3.5 text-muted-foreground" aria-hidden="true" />
                        <span className="truncate text-sm font-medium">{l.event}</span>
                        <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
                          {l.botName}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{l.description}</p>
                    </li>
                  ))}
                  {activity.length === 0 && (
                    <li className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing here yet.</li>
                  )}
                </ul>
              </section>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
