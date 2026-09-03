import type { ReactNode } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import type { Bot } from "@/types/bot";
import { useBotStore } from "@/stores/useBotStore";
import { useHydrated } from "@/hooks/useHydrated";
import { AppShell } from "./AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/common/StatusDot";

export function BotPage({
  section,
  actions,
  children,
}: {
  section: string;
  actions?: ReactNode;
  children: (bot: Bot, patch: (patch: Partial<Bot>) => void) => ReactNode;
}) {
  const { botId } = useParams({ strict: false }) as { botId?: string };
  const hydrated = useHydrated();
  const bot = useBotStore((s) => s.bots.find((b) => b.id === botId));
  const updateBot = useBotStore((s) => s.updateBot);

  const LOCKED_SECTIONS = ["Commands", "Components", "Automations", "Events"];
  const locked = !!bot?.purchased && LOCKED_SECTIONS.includes(section);

  const breadcrumb = (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      <Link to="/bots" className="text-muted-foreground hover:text-foreground">
        Bots
      </Link>
      <span className="text-muted-foreground">/</span>
      {bot && (
        <>
          <Link
            to="/bots/$botId"
            params={{ botId: bot.id }}
            className="flex min-w-0 items-center gap-1.5 font-medium text-foreground"
          >
            <StatusDot status={bot.status} />
            <span className="truncate">{bot.name}</span>
          </Link>
          <span className="text-muted-foreground">/</span>
        </>
      )}
      <span className="truncate text-muted-foreground">{section}</span>
    </nav>
  );

  return (
    <AppShell title={section} breadcrumb={breadcrumb} actions={actions}>
      <div className="p-4 md:p-6">
        {!hydrated ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-52" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !bot ? (
          <div className="mx-auto max-w-md py-20 text-center">
            <h2 className="text-lg font-semibold">Bot not found</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This bot may have been deleted or the link is incorrect.
            </p>
            <Button asChild className="mt-5">
              <Link to="/bots">Back to my bots</Link>
            </Button>
          </div>
        ) : locked ? (
          <div className="mx-auto max-w-lg py-16 text-center">
            <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-elevated text-muted-foreground">
              <Lock className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-lg font-semibold">{section} are locked</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This bot was bought from the marketplace. Its logic stays locked — you can still change its appearance,
              presence and settings.
            </p>
            <Button asChild className="mt-5">
              <Link to="/bots/$botId" params={{ botId: bot.id }}>
                Back to overview
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {bot.purchased && (
              <div className="mb-4 flex items-start gap-2.5 rounded-md border border-border bg-elevated px-3.5 py-2.5">
                <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">
                  Purchased bot — appearance-only editing. Commands, components, automations and events are locked.
                </p>
              </div>
            )}
            {children(bot, (patch) => updateBot(bot.id, patch))}
          </>
        )}
      </div>
    </AppShell>
  );
}
