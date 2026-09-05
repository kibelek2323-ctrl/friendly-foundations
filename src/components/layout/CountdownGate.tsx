import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Lock, Users, Wrench, Zap } from "lucide-react";
import { amIAdmin } from "@/lib/admin-codes.functions";
import {
  getSiteGate,
  unlockMaintenance,
  DEFAULT_COUNTDOWN,
  DEFAULT_MAINTENANCE,
  DEFAULT_LAUNCH_AT,
  type MaintenanceSettings,
} from "@/lib/countdown.functions";
import { useAuthStore } from "@/stores/useAuthStore";

export const LAUNCH_AT = DEFAULT_LAUNCH_AT;

/** Routes that stay reachable while the countdown is up. */
const OPEN_PATHS = ["/xadmx", "/docs", "/about"];

/** Remembers that the site was fully open, so returning visitors never flash a gate screen. */
const OPEN_CACHE_KEY = "bottly-site-open";

/** Remembers, for this browser session, that the maintenance password was entered. */
const UNLOCK_KEY = "bottly-maintenance-unlock";

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

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Zap className="size-5" aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold tracking-tight">Bottly</span>
    </div>
  );
}

function CountdownScreen({ target }: { target: number }) {
  const { days, hours, minutes, seconds } = useCountdown(target);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center">
      <Wordmark />

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
          search={{ from: "countdown" }}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <BookOpen className="size-4" aria-hidden="true" /> Our Docs
        </Link>
        <Link
          to="/about"
          search={{ from: "countdown" }}
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition hover:bg-muted"
        >
          <Users className="size-4" aria-hidden="true" /> About us
        </Link>
      </div>

      <p className="mt-10 text-xs text-muted-foreground">© {new Date().getFullYear()} Bottly</p>
    </div>
  );
}

function MaintenanceScreen({
  settings,
  hasPassword,
  onUnlock,
}: {
  settings: MaintenanceSettings;
  hasPassword: boolean;
  onUnlock: () => void;
}) {
  const back = settings.endsAt ? new Date(settings.endsAt) : null;
  const unlock = useServerFn(unlockMaintenance);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const res = await unlock({ data: { password } });
      if (res.ok) onUnlock();
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center">
      <button
        type="button"
        onClick={() => hasPassword && setOpen(true)}
        aria-label={hasPassword ? "Admin access" : undefined}
        className="flex size-14 cursor-default items-center justify-center rounded-2xl bg-elevated text-primary"
      >
        <Wrench className="size-7" aria-hidden="true" />
      </button>
      <h1 className="mt-6 max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
        We are under <span className="text-primary">maintenance</span>
      </h1>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">{settings.status}</p>

      <div className="panel mt-8 rounded-xl px-6 py-4 text-sm">
        <span className="text-muted-foreground">Expected back: </span>
        <span suppressHydrationWarning className="font-medium">
          {back ? back.toLocaleString() : "Not known yet"}
        </span>
      </div>

      {hasPassword && open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="panel w-full max-w-sm space-y-3 rounded-2xl p-6 text-left shadow-2xl"
          >
            <label htmlFor="maintenance-password" className="flex items-center gap-2 text-sm font-medium">
              <Lock className="size-4 text-primary" aria-hidden="true" /> Admin password
            </label>
            <input
              id="maintenance-password"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password to continue"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            {error && <p className="text-xs text-destructive">Incorrect password.</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !password}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "Checking…" : "Enter site"}
              </button>
            </div>
          </form>
        </div>
      )}


      <p className="mt-10 text-xs text-muted-foreground">© {new Date().getFullYear()} Bottly</p>
    </div>
  );
}


export function CountdownGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const checkAdmin = useServerFn(amIAdmin);
  const loadGate = useServerFn(getSiteGate);

  // Remembered "site is open" verdict: skips any gate flash on later visits.
  const [cachedOpen, setCachedOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    try {
      setCachedOpen(window.localStorage.getItem(OPEN_CACHE_KEY) === "1");
      setUnlocked(window.sessionStorage.getItem(UNLOCK_KEY) === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);


  const { data: gate } = useQuery({
    queryKey: ["site-gate"],
    queryFn: () => loadGate(),
    staleTime: 60 * 1000,
  });

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const countdown = gate?.countdown ?? DEFAULT_COUNTDOWN;
  const maintenance = gate?.maintenance ?? DEFAULT_MAINTENANCE;
  const countdownUp = countdown.enabled && Date.now() < countdown.launchAt;
  const gated = countdownUp || maintenance.enabled;

  // Persist the open/closed verdict as soon as the real settings arrive.
  useEffect(() => {
    if (!gate) return;
    try {
      const stillGated = (gate.countdown.enabled && Date.now() < gate.countdown.launchAt) || gate.maintenance.enabled;
      if (stillGated) {
        window.localStorage.removeItem(OPEN_CACHE_KEY);
        setCachedOpen(false);
      } else {
        window.localStorage.setItem(OPEN_CACHE_KEY, "1");
        setCachedOpen(true);
      }
    } catch {
      /* storage unavailable */
    }
  }, [gate]);

  const isOpenRoute = OPEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const adminBypass = !!user && initialized && !isLoading && isAdmin === true;

  if (!gated || isOpenRoute || adminBypass || unlocked) return <>{children}</>;
  // Before the settings load: trust the remembered "open" verdict, otherwise hold the gate.
  if (!gate && cachedOpen) return <>{children}</>;
  if (!gate) return <div className="min-h-screen bg-background" />;

  if (maintenance.enabled)
    return (
      <MaintenanceScreen
        settings={maintenance}
        hasPassword={gate.maintenancePassword}
        onUnlock={() => {
          try {
            window.sessionStorage.setItem(UNLOCK_KEY, "1");
          } catch {
            /* storage unavailable */
          }
          setUnlocked(true);
        }}
      />
    );
  return <CountdownScreen target={countdown.launchAt} />;
}

