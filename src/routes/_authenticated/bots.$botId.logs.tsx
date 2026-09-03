import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { BotPage } from "@/components/layout/BotPage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { useRuntimeEvents } from "@/hooks/useRuntimeEvents";
import type { LogLevel } from "@/types/bot";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bots/$botId/logs")({
  head: () => ({
    meta: [
      { title: "Bot activity logs — Bottly" },
      { name: "description", content: "Inspect command runs, automation results and errors from your bot." },
      { property: "og:title", content: "Bot activity logs — Bottly" },
      { property: "og:description", content: "Inspect command runs, automation results and errors from your bot." },
    ],
  }),
  component: Page,
});

const LEVELS: (LogLevel | "all")[] = ["all", "info", "success", "warning", "error"];

const LEVEL_CLASS: Record<LogLevel, string> = {
  info: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  error: "bg-destructive/15 text-destructive",
};

function Page() {
  const { botId } = Route.useParams();
  const [level, setLevel] = useState<LogLevel | "all">("all");
  const [query, setQuery] = useState("");
  const runtime = useRuntimeEvents(botId);

  return (
    <BotPage section="Logs">
      {(bot, patch) => {
        const needle = query.toLowerCase();
        // Runtime events come from the server (bot_runtime_events); dashboard
        // actions are still local to this browser. Show one merged list.
        const logs = [...runtime.events, ...bot.logs]
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
          .filter(
            (l) =>
              (level === "all" || l.level === level) &&
              (l.event.toLowerCase().includes(needle) ||
                l.description.toLowerCase().includes(needle)),
          );

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1.5">
                {LEVELS.map((l) => (
                  <Button
                    key={l}
                    size="sm"
                    variant={level === l ? "default" : "outline"}
                    onClick={() => setLevel(l)}
                    className="capitalize"
                  >
                    {l}
                  </Button>
                ))}
              </div>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search logs"
                aria-label="Search logs"
                className="max-w-xs"
              />
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => void runtime.refresh()}
                disabled={runtime.loading}
              >
                {runtime.loading ? "Refreshing" : "Refresh"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => patch({ logs: [] })}>
                Clear logs
              </Button>
            </div>

            {logs.length === 0 ? (
              <EmptyState icon={ScrollText} title="No log entries." description="Activity from your bot will appear here." />
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {logs.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-3 bg-card px-4 py-3">
                    <Badge className={cn("uppercase", LEVEL_CLASS[l.level])} variant="secondary">
                      {l.level}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(l.timestamp).toLocaleString()}
                    </span>
                    <span className="text-sm font-medium">{l.event}</span>
                    <span className="w-full text-sm text-muted-foreground sm:w-auto sm:flex-1">{l.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      }}
    </BotPage>
  );
}
