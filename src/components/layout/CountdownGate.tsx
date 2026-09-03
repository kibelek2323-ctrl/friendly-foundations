import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Zap } from "lucide-react";
import { amIAdmin } from "@/lib/admin-codes.functions";
import { useAuthStore } from "@/stores/useAuthStore";
import { useHydrated } from "@/hooks/useHydrated";

/** Launch: 18 September 2026, 10:00 Europe/Warsaw (UTC+2). */
export const LAUNCH_AT = Date.UTC(2026, 8, 18, 8, 0, 0);

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
      <span className="text-3xl font-semibold tabular-nums tracking-tight sm:text-5xl">{value}</span>
      <span className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground sm:text-xs">{label}</span>
    </div>
  );
}

function CountdownScreen() {
  const { days, hours, minutes, seconds } = useCountdown(LAUNCH_AT);
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
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        Launching September 18 at 10:00. The visual Discord bot builder — embeds, commands, components and automations.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
        <Unit value={String(days)} label="days" />
        <Unit value={pad(hours)} label="hrs" />
        <Unit value={pad(minutes)} label="min" />
        <Unit value={pad(seconds)} label="sec" />
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
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const launched = Date.now() >= LAUNCH_AT;
  const isAdminRoute = pathname.startsWith("/xadmx");

  if (launched || isAdminRoute) return <>{children}</>;
  // Never block on the admin check: show the countdown instantly and swap in
  // the app only once the admin role is confirmed.
  if (user && initialized && !isLoading && isAdmin === true) return <>{children}</>;

  return <CountdownScreen />;
}
