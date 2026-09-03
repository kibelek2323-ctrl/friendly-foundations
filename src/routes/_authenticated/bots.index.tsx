import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bot as BotIcon, Copy, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusDot } from "@/components/common/StatusDot";
import { useBotStore } from "@/stores/useBotStore";
import { useHydrated } from "@/hooks/useHydrated";
import type { BotStatus } from "@/types/bot";

export const Route = createFileRoute("/_authenticated/bots/")({
  head: () => ({
    meta: [
      { title: "My Discord bots — Bottly" },
      { name: "description", content: "Browse, duplicate and manage every Discord bot in your Bottly workspace." },
      { property: "og:title", content: "My Discord bots — Bottly" },
      { property: "og:description", content: "Browse, duplicate and manage every Discord bot in your Bottly workspace." },
    ],
  }),
  component: Page,
});

const FILTERS: (BotStatus | "all")[] = ["all", "online", "offline", "draft"];

function Page() {
  const hydrated = useHydrated();
  const bots = useBotStore((s) => s.bots);
  const duplicateBot = useBotStore((s) => s.duplicateBot);
  const deleteBot = useBotStore((s) => s.deleteBot);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<BotStatus | "all">("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const list = bots.filter(
    (b) =>
      (filter === "all" || b.status === filter) &&
      (b.name.toLowerCase().includes(query.toLowerCase()) || b.username.toLowerCase().includes(query.toLowerCase())),
  );
  const target = bots.find((b) => b.id === deleting);

  return (
    <AppShell title="My Bots">
      <div className="space-y-5 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-xl font-semibold">My Bots</h1>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bots"
            aria-label="Search bots"
            className="max-w-xs"
          />
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
                {f}
              </Button>
            ))}
          </div>
        </div>

        {!hydrated ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-44 w-full rounded-lg" />
            ))}
          </div>
        ) : bots.length === 0 ? (
          <EmptyState
            icon={BotIcon}
            title="No bots yet."
            description="Create your first Discord bot — no code required."
            actionLabel="Create a bot"
            onAction={() => void navigate({ to: "/bots/new" })}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((b) => (
              <article key={b.id} className="panel flex flex-col p-5 transition hover:border-primary/50">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                    {b.avatar ? <img src={b.avatar} alt="" className="size-full object-cover" /> : b.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link to="/bots/$botId" params={{ botId: b.id }} className="truncate font-semibold hover:underline">
                      {b.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">@{b.username}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Actions for ${b.name}`}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => void navigate({ to: "/bots/$botId/settings", params: { botId: b.id } })}>
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          const copy = duplicateBot(b.id);
                          if (copy) toast.success(`${copy.name} created`);
                        }}
                      >
                        <Copy className="size-4" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onSelect={() => setDeleting(b.id)}>
                        <Trash2 className="size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{b.description}</p>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <StatusDot status={b.status} />
                  <span>·</span>
                  <span>{b.servers} servers</span>
                  <span>·</span>
                  <span>{b.commands.length} commands</span>

                </div>

                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link to="/bots/$botId" params={{ botId: b.id }}>
                      Open
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to="/bots/$botId/presence" params={{ botId: b.id }}>
                      Presence
                    </Link>
                  </Button>
                </div>
              </article>
            ))}

            <Link
              to="/bots/new"
              className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground transition hover:border-primary hover:text-foreground"
            >
              <Plus className="size-5" aria-hidden="true" />
              Create a new bot
            </Link>
          </div>
        )}

        <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {target?.name}?</AlertDialogTitle>
              <AlertDialogDescription>This permanently removes the bot and its configuration.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleting) {
                    deleteBot(deleting);
                    toast.success("Bot deleted");
                  }
                  setDeleting(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}
