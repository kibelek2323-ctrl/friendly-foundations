import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bell, Bot, CheckCheck, CircleDollarSign, Loader2, Megaphone, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from "@/lib/notifications.functions";
import { cn } from "@/lib/utils";

const icons = {
  announcement: Megaphone,
  purchase: CircleDollarSign,
  sale: CircleDollarSign,
  bot_status: Bot,
  bot_error: TriangleAlert,
  system: Bell,
};

export function NotificationCenter() {
  const queryClient = useQueryClient();
  const fetchNotifications = useServerFn(getMyNotifications);
  const markRead = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetchNotifications(),
    refetchInterval: 60_000,
  });
  const items = query.data ?? [];
  const unread = items.filter((item) => !item.read).length;

  const readOne = async (item: NotificationItem) => {
    if (!item.read) {
      await markRead({ data: { id: item.id } });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
          <Bell className="size-4" aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-1rem))] p-0">
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-[11px] text-muted-foreground">{unread ? `${unread} unread` : "You're all caught up"}</p>
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={async () => {
                await markAll();
                await queryClient.invalidateQueries({ queryKey: ["notifications"] });
              }}
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[26rem] overflow-y-auto">
          {query.isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : query.isError ? (
            <p className="px-4 py-10 text-center text-sm text-destructive">Notifications couldn't be loaded.</p>
          ) : items.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Bell className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No notifications yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Bot events, purchases and announcements will appear here.</p>
            </div>
          ) : (
            items.map((item) => {
              const Icon = icons[item.kind];
              const content = (
                <div className={cn("flex gap-3 px-4 py-3 transition hover:bg-accent/60", !item.read && "bg-primary/5")}>
                  <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-elevated", item.kind === "bot_error" ? "text-destructive" : item.kind === "purchase" || item.kind === "sale" ? "text-success" : "text-primary")}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      <span className="flex-1 text-sm font-medium">{item.title}</span>
                      {!item.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{item.body}</span>
                    <span className="mt-1 block text-[10px] text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span>
                  </span>
                </div>
              );
              return item.href?.startsWith("/") ? (
                <Link key={item.id} to={item.href} onClick={() => void readOne(item)} className="block border-b border-border last:border-0">
                  {content}
                </Link>
              ) : (
                <button key={item.id} type="button" onClick={() => void readOne(item)} className="block w-full border-b border-border text-left last:border-0">
                  {content}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}