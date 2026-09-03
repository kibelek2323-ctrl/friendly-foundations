import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Puzzle, ScrollText, Terminal, Workflow } from "lucide-react";
import { BotPage } from "@/components/layout/BotPage";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/common/StatusDot";
import { DiscordMessagePreview } from "@/components/discord/DiscordMessagePreview";
import { BotRuntimeControls } from "@/components/bots/BotRuntimeControls";
import { useFlowStore } from "@/stores/useFlowStore";

export const Route = createFileRoute("/_authenticated/bots/$botId/")({
  head: () => ({
    meta: [
      { title: "Bot overview — Bottly" },
      { name: "description", content: "See your bot's status, stats, live message preview and recent activity." },
      { property: "og:title", content: "Bot overview — Bottly" },
      { property: "og:description", content: "See your bot's status, stats, live message preview and recent activity." },
    ],
  }),
  component: Page,
});

const SECTIONS = [
  { to: "/bots/$botId/commands", label: "Commands", icon: Terminal, key: "commands" as const },
  { to: "/bots/$botId/presence", label: "Presence", icon: BadgeCheck, key: "presence" as const },
  { to: "/bots/$botId/components", label: "Components", icon: Puzzle, key: "components" as const },
  { to: "/bots/$botId/automations", label: "Automations", icon: Workflow, key: "automations" as const },
];

function Page() {
  const navigate = useNavigate();

  return (
    <BotPage section="Overview">
      {(bot, patch) => {
        const counts = {
          commands: bot.commands.length,
          presence: bot.presence?.status ?? "online",
          components: bot.components.length,
          automations: bot.automations.length,
        };
        const online = bot.status === "online";

        return (
          <div className="space-y-5">
            <div className="panel flex flex-wrap items-center gap-4 p-5">
              <span className="flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-primary text-xl font-semibold text-primary-foreground">
                {bot.avatar ? (
                  <img src={bot.avatar} alt="" className="size-full object-cover" />
                ) : (
                  bot.name.slice(0, 2).toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{bot.name}</h2>
                  <StatusDot status={bot.status} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{bot.description}</p>
              </div>
              <Button
                className="gap-1.5"
                onClick={() => {
                  const flowId = bot.flowId ?? useFlowStore.getState().newFlow(`${bot.name} — main flow`);
                  if (!bot.flowId) patch({ flowId });
                  void navigate({ to: "/builder/$flowId", params: { flowId } });
                }}
              >
                <Workflow className="size-4" /> Open flow builder
              </Button>
              <BotRuntimeControls bot={bot} patch={patch} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Servers", value: bot.servers.toLocaleString() },
                { label: "Members reached", value: bot.members.toLocaleString() },
                { label: "Uptime", value: bot.uptime },
                { label: "Commands", value: String(counts.commands) },
              ].map((s) => (
                <div key={s.label} className="panel p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p className="mt-1 text-2xl font-semibold">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Builder</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SECTIONS.map((s) => (
                    <Link
                      key={s.to}
                      to={s.to}
                      params={{ botId: bot.id }}
                      className="panel flex items-center gap-3 p-4 transition hover:border-primary/60"
                    >
                      <span className="flex size-9 items-center justify-center rounded-md bg-elevated text-primary">
                        <s.icon className="size-4" aria-hidden="true" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium">{s.label}</span>
                        <span className="block text-xs text-muted-foreground">{s.key === "presence" ? `Status: ${counts.presence}` : `${counts[s.key]} configured`}</span>
                      </span>
                    </Link>
                  ))}
                </div>

                <h3 className="pt-2 text-sm font-semibold">Recent activity</h3>
                <ul className="panel divide-y divide-border">
                  {bot.logs.slice(0, 5).map((l) => (
                    <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <ScrollText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="font-medium">{l.event}</span>
                      <span className="truncate text-muted-foreground">{l.description}</span>
                    </li>
                  ))}
                  {bot.logs.length === 0 && (
                    <li className="px-4 py-6 text-center text-sm text-muted-foreground">No activity yet.</li>
                  )}
                </ul>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold">Live preview</h3>
                <DiscordMessagePreview design={bot.design} components={bot.components} />
              </div>
            </div>
          </div>
        );
      }}
    </BotPage>
  );
}
