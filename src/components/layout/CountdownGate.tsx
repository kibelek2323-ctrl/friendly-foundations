import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Users, Zap } from "lucide-react";
import { amIAdmin } from "@/lib/admin-codes.functions";
import { getCountdownSettings, DEFAULT_COUNTDOWN, DEFAULT_LAUNCH_AT } from "@/lib/countdown.functions";
import { useAuthStore } from "@/stores/useAuthStore";

export const LAUNCH_AT = DEFAULT_LAUNCH_AT;

/** Routes that stay reachable while the countdown is up. */
const OPEN_PATHS = ["/xadmx", "/docs", "/about"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function useCountdown(target: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const diff = Math.max(0, target - now);
  const s = Math.floor(diff / 1000);
  return {
    done: diff === 0,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <div className="panel flex min-w-[74px] flex-col items-center rounded-xl px-3 py-4 sm:min-w-[104px] sm:px-5 sm:py-6">
      <span suppressHydrationWarning className="text-3xl font-semibold tabular-nums tracking-tight sm:text-5xl">
        {value}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground sm:text-xs">{label}</span>
    </div>
  );
}

function CountdownScreen({ target }: { target: number }) {
  const { days, hours, minutes, seconds } = useCountdown(target);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center">
      <div className="flex items-center gap-2">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Zap className="size-5" aria-hidden="true" />
        </span>
        <span className="text-lg font-semibold tracking-tight">Bottly</span>
      </div>

      <h1 className="mt-8 max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-5xl">
        Build Discord bots <span className="text-primary">visually</span>.
      </h1>
      <p className="mt-3 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Buy · Sell · Design · Rebrand — no coding
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        <Unit value={String(days)} label="days" />
        <Unit value={pad(hours)} label="hrs" />
        <Unit value={pad(minutes)} label="min" />
        <Unit value={pad(seconds)} label="sec" />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/docs"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <BookOpen className="size-4" aria-hidden="true" /> Our Docs
        </Link>
        <Link
          to="/about"
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-muted"
        >
          <Users className="size-4" aria-hidden="true" /> About us
        </Link>
      </div>

      <p className="mt-10 text-xs text-muted-foreground">© {new Date().getFullYear()} Bottly</p>
    </div>
  );
}

export function CountdownGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const checkAdmin = useServerFn(amIAdmin);
  const loadSettings = useServerFn(getCountdownSettings);

  const { data: settings } = useQuery({
    queryKey: ["countdown-settings"],
    queryFn: () => loadSettings(),
    staleTime: 60 * 1000,
  });

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const effective = settings ?? DEFAULT_COUNTDOWN;
  const launched = !effective.enabled || Date.now() >= effective.launchAt;
  const isOpenRoute = OPEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (launched || isOpenRoute) return <>{children}</>;
  // Never block on the admin check: show the countdown instantly and swap in
  // the app only once the admin role is confirmed.
  if (user && initialized && !isLoading && isAdmin === true) return <>{children}</>;

  return <CountdownScreen target={effective.launchAt} />;
}
