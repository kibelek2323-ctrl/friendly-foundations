import type { ReactNode } from "react";
import { Link, useParams } from "@tanstack/react-router";
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
        ) : (
          children(bot, (patch) => updateBot(bot.id, patch))
        )}
      </div>
    </AppShell>
  );
}
