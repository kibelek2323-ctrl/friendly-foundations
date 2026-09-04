import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save, Timer } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { adminSaveCountdown, getCountdownSettings } from "@/lib/countdown.functions";

export const Route = createFileRoute("/_authenticated/admin/countdown")({
  head: () => ({
    meta: [
      { title: "Countdown — Bottly admin" },
      { name: "description", content: "Turn the launch countdown on or off and change the launch date." },
      { property: "og:title", content: "Countdown — Bottly admin" },
      { property: "og:description", content: "Turn the launch countdown on or off and change the launch date." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

/** Convert an epoch ms value to the value format of <input type="datetime-local"> (local time). */
function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Page() {
  const load = useServerFn(getCountdownSettings);
  const save = useServerFn(adminSaveCountdown);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["countdown-admin"], queryFn: () => load() });

  const [enabled, setEnabled] = useState(true);
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setEnabled(data.enabled);
    setWhen(toLocalInput(data.launchAt));
  }, [data]);

  const submit = async (next?: { enabled?: boolean; minutesFromNow?: number }) => {
    const launchAt =
      next?.minutesFromNow !== undefined
        ? Date.now() + next.minutesFromNow * 60_000
        : new Date(when).getTime();
    if (!Number.isFinite(launchAt)) {
      toast.error("Pick a valid launch date and time.");
      return;
    }
    setBusy(true);
    try {
      const res = await save({ data: { enabled: next?.enabled ?? enabled, launchAt } });
      if (!res.ok) {
        toast.error(res.error ?? "Could not save the countdown.");
        return;
      }
      toast.success("Countdown settings saved.");
      void refetch();
    } catch {
      toast.error("Could not save the countdown.");
    } finally {
      setBusy(false);
    }
  };

  const preview = data ? new Date(data.launchAt) : null;

  return (
    <AppShell title="Countdown">
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Timer className="size-5 text-primary" aria-hidden="true" /> Launch countdown
          </h1>
          <p className="text-sm text-muted-foreground">
            While the countdown is on, visitors only see the countdown screen, the docs and the about page. Admins
            always get through.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : (
          <>
            <section className="panel flex flex-wrap items-center gap-4 p-5">
              <div className="mr-auto">
                <p className="font-medium">Countdown screen</p>
                <p className="text-sm text-muted-foreground">
                  {enabled ? "On — the site is locked until the launch time." : "Off — the whole site is public."}
                </p>
              </div>
              <Switch
                checked={enabled}
                disabled={busy}
                onCheckedChange={(v) => {
                  setEnabled(v);
                  void submit({ enabled: v });
                }}
              />
            </section>

            <section className="panel space-y-4 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="launch-at">Launch date and time (your local time)</Label>
                <Input
                  id="launch-at"
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  className="max-w-xs"
                />
                {preview && (
                  <p className="text-xs text-muted-foreground">
                    Currently saved: {preview.toLocaleString()} ({preview.toUTCString()})
                  </p>
                )}
              </div>
              <Button className="gap-1.5" disabled={busy} onClick={() => void submit()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" aria-hidden="true" />}{" "}
                Save launch time
              </Button>
            </section>

            <section className="panel space-y-3 p-5">
              <p className="font-medium">Testing shortcuts</p>
              <p className="text-sm text-muted-foreground">Set the launch a short time from now to test the screen.</p>
              <div className="flex flex-wrap gap-2">
                {[2, 10, 60, 60 * 24].map((m) => (
                  <Button
                    key={m}
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void submit({ enabled: true, minutesFromNow: m })}
                  >
                    {m < 60 ? `${m} min` : m === 60 ? "1 hour" : "1 day"}
                  </Button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
