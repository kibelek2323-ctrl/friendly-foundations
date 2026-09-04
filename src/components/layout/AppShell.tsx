import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { amIAdmin } from "@/lib/admin-codes.functions";
import { getMyBalance } from "@/lib/marketplace.functions";
import { usd } from "@/lib/money";
import {
  BookOpen,
  Bot as BotIcon,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Newspaper,
  DollarSign,
  Menu,
  BadgeCheck,
  KeyRound,
  Flag,
  Users,
  Gift,
  Heart,
  Banknote,
  ChartLine,
  Plus,
  Puzzle,
  ScrollText,
  Search,
  Settings,
  Sparkles,
  Store,
  Terminal,
  Timer,
  Workflow,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useBotStore } from "@/stores/useBotStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { CommandPalette, useCommandPalette } from "./CommandPalette";
import { initials } from "@/lib/id";
import { StatusDot } from "@/components/common/StatusDot";
import { useProfileAvatar } from "@/hooks/useProfileAvatar";
import { NotificationCenter } from "./NotificationCenter";


function NavItem({
  to,
  icon: Icon,
  label,
  onNavigate,
  iconClassName,
}: {
  to: string;
  icon: typeof BotIcon;
  label: string;
  onNavigate?: (() => void) | undefined;
  iconClassName?: string;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(`${to}/`)) || pathname === to;
  return (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className={cn("size-4 shrink-0", iconClassName)} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const bots = useBotStore((s) => s.bots);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const { avatarUrl, displayName, discordUsername } = useProfileAvatar();
  const navigate = useNavigate();
  const checkAdmin = useServerFn(amIAdmin);
  const { data: isAdmin } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin(),
    staleTime: 5 * 60 * 1000,
  });
  const fetchBalance = useServerFn(getMyBalance);
  const { data: balance } = useQuery({
    queryKey: ["my-balance"],
    queryFn: () => fetchBalance(),
    staleTime: 60 * 1000,
  });




  const match = /^\/bots\/([^/]+)/.exec(pathname);
  const botId = match?.[1] && match[1] !== "new" ? match[1] : null;
  const bot = botId ? bots.find((b) => b.id === botId) : undefined;

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-2 px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-sidebar-accent/60"
              aria-label="Open main navigation"
            >
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="size-4" aria-hidden="true" />
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-foreground">Bottly</span>
              <ChevronDown className="ml-auto size-4 text-muted-foreground" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem asChild>
              <Link to="/dashboard" onClick={onNavigate}><LayoutDashboard /> Dashboard</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/bots" onClick={onNavigate}><BotIcon /> My Bots</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/marketplace" onClick={onNavigate}><Store /> Marketplace</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/marketplace/favorites" onClick={onNavigate}><Heart /> Saved bots</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/" onClick={onNavigate}><Sparkles /> Homepage</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <nav className="space-y-6" aria-label="Main">
          {bot && (
            <div>
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {bot.name}
              </p>
              <div className="space-y-0.5">
                <NavItem to={`/bots/${bot.id}`} icon={Sparkles} label="Overview" onNavigate={onNavigate} />
                <NavItem to={`/bots/${bot.id}/commands`} icon={Terminal} label="Commands" onNavigate={onNavigate} />
                <NavItem to={`/bots/${bot.id}/presence`} icon={BadgeCheck} label="Presence" onNavigate={onNavigate} />
                <NavItem to={`/bots/${bot.id}/components`} icon={Puzzle} label="Components" onNavigate={onNavigate} />
                <NavItem to={`/bots/${bot.id}/automations`} icon={Workflow} label="Automations" onNavigate={onNavigate} />
                <NavItem to={`/bots/${bot.id}/events`} icon={Zap} label="Events" onNavigate={onNavigate} />
                <NavItem to={`/bots/${bot.id}/logs`} icon={ScrollText} label="Logs" onNavigate={onNavigate} />
                <NavItem to={`/bots/${bot.id}/settings`} icon={Settings} label="Settings" onNavigate={onNavigate} />
              </div>
              <div className="mt-2 flex items-center justify-between rounded-md bg-sidebar-accent/50 px-2.5 py-2">
                <span className="truncate text-xs text-muted-foreground">@{bot.username}</span>
                <StatusDot status={bot.status} />
              </div>
            </div>
          )}

          <div className="space-y-0.5">
            <NavItem to="/payouts" icon={Banknote} label="Earnings" onNavigate={onNavigate} />

            <NavItem to="/balance" icon={DollarSign} iconClassName="text-success" label="Balance" onNavigate={onNavigate} />
            <NavItem to="/referrals" icon={Gift} iconClassName="text-success" label="Invite friends" onNavigate={onNavigate} />
            <NavItem to="/billing" icon={CreditCard} label="Plan & billing" onNavigate={onNavigate} />
            {isAdmin && <NavItem to="/admin/codes" icon={KeyRound} label="Admin codes" onNavigate={onNavigate} />}
            {isAdmin && <NavItem to="/admin/announcements" icon={Megaphone} label="Announcements" onNavigate={onNavigate} />}
            {isAdmin && <NavItem to="/admin/reports" icon={Flag} label="Moderation" onNavigate={onNavigate} />}
            {isAdmin && <NavItem to="/admin/users" icon={Users} label="Users" onNavigate={onNavigate} />}
            {isAdmin && <NavItem to="/admin/payouts" icon={Banknote} label="Payouts" onNavigate={onNavigate} />}
            {isAdmin && <NavItem to="/admin/referrals" icon={Gift} label="Referrals" onNavigate={onNavigate} />}
            {isAdmin && <NavItem to="/admin/countdown" icon={Timer} label="Countdown" onNavigate={onNavigate} />}
            {isAdmin && <NavItem to="/admin/blog" icon={Newspaper} label="Blog & changelog" onNavigate={onNavigate} />}
            {isAdmin && <NavItem to="/admin/stats" icon={ChartLine} label="Platform stats" onNavigate={onNavigate} />}
            <NavItem to="/docs" icon={BookOpen} label="Docs" onNavigate={onNavigate} />
            <NavItem to="/templates" icon={Sparkles} label="Templates" onNavigate={onNavigate} />
            <NavItem to="/pricing" icon={Sparkles} label="Pricing" onNavigate={onNavigate} />
          </div>
        </nav>
      </div>

      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2">

          <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              initials(user?.name ?? "Guest") || "G"
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{displayName ?? user?.name ?? "Guest builder"}</p>
            {user && (
              <Link
                to="/balance"
                onClick={onNavigate}
                className="text-xs font-semibold text-success hover:underline"
              >
                {usd(balance?.balance ?? 0)}
              </Link>
            )}
            <p className="truncate text-xs text-muted-foreground">
              {discordUsername ? `@${discordUsername}` : (user?.email ?? "Not signed in")}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            aria-label={user ? "Sign out" : "Sign in"}
            onClick={() => {
              if (user) signOut();
              void navigate({ to: "/login" });
              onNavigate?.();
            }}
          >
            <LogOut className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface AppShellProps {
  children: ReactNode;
  title: string;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
}

export function AppShell({ children, title, breadcrumb, actions }: AppShellProps) {
  const { open, setOpen } = useCommandPalette();
  const [drawer, setDrawer] = useState(false);
  const saveState = useBotStore((s) => s.saveState);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-sidebar-border lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur">
          <Sheet open={drawer} onOpenChange={setDrawer}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent onNavigate={() => setDrawer(false)} />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            {breadcrumb ?? <h1 className="truncate text-sm font-semibold">{title}</h1>}
          </div>

          <span
            aria-live="polite"
            className={cn(
              "hidden text-xs sm:inline",
              saveState === "saving" && "text-warning",
              saveState === "saved" && "text-success",
              saveState === "error" && "text-destructive",
              saveState === "idle" && "text-muted-foreground",
            )}
          >
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : ""}
          </span>

          <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
            <Search className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden rounded border border-border bg-elevated px-1.5 text-[10px] font-medium text-muted-foreground md:inline">
              ⌘K
            </kbd>
          </Button>

          <NotificationCenter />

          {actions ?? (
            <Button size="sm" className="gap-1.5" onClick={() => void navigate({ to: "/bots/new" })}>
              <Plus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">New bot</span>
            </Button>
          )}
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </div>
  );
}
