import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DollarSign, LayoutDashboard } from "lucide-react";
import { getMyBalance } from "@/lib/marketplace.functions";
import { usd } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileAvatar } from "@/hooks/useProfileAvatar";
import { useHydrated } from "@/hooks/useHydrated";

/** Session-aware sign-in affordance for public marketing pages. */
export function AccountNav() {
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const { avatarUrl, displayName } = useProfileAvatar();
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
      <Link
        to="/billing"
        className="flex items-center gap-2 rounded-full border border-border bg-elevated py-1 pl-1 pr-3 text-sm transition-colors hover:border-primary/50"
      >
        <Avatar className="size-6">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback className="text-[10px]">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[10rem] truncate sm:inline">{name}</span>
      </Link>
      <Button asChild size="sm" className="gap-1.5">
        <Link to="/dashboard">
          <LayoutDashboard className="size-4" aria-hidden="true" /> Open dashboard
        </Link>
      </Button>
    </>
  );
}
