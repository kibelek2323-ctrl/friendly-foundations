import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, ChevronDown, CircleHelp,
  Newspaper, DollarSign, Gauge, LayoutDashboard, LogOut, ScrollText, Store, UserRound } from "lucide-react";
import { getMyBalance } from "@/lib/marketplace.functions";
import { usd } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileAvatar } from "@/hooks/useProfileAvatar";
import { useHydrated } from "@/hooks/useHydrated";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** Session-aware sign-in affordance for public marketing pages. */
export function AccountNav() {
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const { avatarUrl, displayName } = useProfileAvatar();
  const signOut = useAuthStore((s) => s.signOut);
  const fetchBalance = useServerFn(getMyBalance);
  const { data: balance } = useQuery({
    queryKey: ["my-balance"],
    queryFn: () => fetchBalance(),
    enabled: Boolean(user),
    staleTime: 60 * 1000,
  });

  if (!hydrated || !initialized) {
    return <div className="h-8 w-32 animate-pulse rounded-md bg-elevated" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <>
        <Button asChild variant="ghost" size="sm">
          <Link to="/login">Log in</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/register">Get started</Link>
        </Button>
      </>
    );
  }

  const name = displayName ?? user.name;

  return (
    <>
      <Link
        to="/balance"
        className="flex items-center rounded-full border border-success/30 bg-success/10 py-1 pl-2 pr-3 text-sm font-semibold text-success transition-colors hover:border-success/60"
      >
        <DollarSign className="mr-1 size-3.5" aria-hidden="true" />
        {usd(balance?.balance ?? 0)}
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 px-1.5 sm:px-2.5" aria-label="Open account menu">
            <Avatar className="size-7">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
              <AvatarFallback className="text-[10px]">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[8rem] truncate lg:inline">{name}</span>
            <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link to="/dashboard"><LayoutDashboard /> Open dashboard</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/marketplace"><Store /> Marketplace</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/balance"><DollarSign className="text-success" /> Balance</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/account-settings"><UserRound /> Account settings</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link to="/blog"><Newspaper /> Blog</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/faq"><CircleHelp /> FAQ</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/status"><Gauge /> Status</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/terms"><ScrollText /> Terms</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link to="/docs"><BookOpen /> Docs</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => signOut()} className="text-destructive focus:text-destructive"><LogOut /> Log out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
