import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save, Wrench } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminSaveMaintenance, getSiteGate } from "@/lib/countdown.functions";

export const Route = createFileRoute("/_authenticated/admin/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance — Bottly admin" },
      { name: "description", content: "Turn the maintenance screen on or off and set the expected end time." },
      { property: "og:title", content: "Maintenance — Bottly admin" },
      { property: "og:description", content: "Turn the maintenance screen on or off and set the expected end time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function toLocalInput(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Page() {
  const load = useServerFn(getSiteGate);
  const save = useServerFn(adminSaveMaintenance);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["maintenance-admin"], queryFn: () => load() });

  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("");
  const [unknownEnd, setUnknownEnd] = useState(true);
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setEnabled(data.maintenance.enabled);
    setStatus(data.maintenance.status);
    setUnknownEnd(data.maintenance.endsAt === null);
    setWhen(toLocalInput(data.maintenance.endsAt ?? Date.now() + 60 * 60 * 1000));
  }, [data]);

  const submit = async (next?: { enabled?: boolean }) => {
    let endsAt: number | null = null;
    if (!unknownEnd) {
      const parsed = new Date(when).getTime();
      if (!Number.isFinite(parsed)) {
        toast.error("Pick a valid end date and time.");
        return;
      }
      endsAt = parsed;
    }
    setBusy(true);
    try {
      const res = await save({ data: { enabled: next?.enabled ?? enabled, status: status.trim(), endsAt } });
      if (!res.ok) {
        toast.error(res.error ?? "Could not save the maintenance settings.");
        return;
      }
      toast.success("Maintenance settings saved.");
      void refetch();
    } catch {
      toast.error("Could not save the maintenance settings.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Maintenance">
      <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Wrench className="size-5 text-primary" aria-hidden="true" /> Maintenance mode
          </h1>
          <p className="text-sm text-muted-foreground">
            While maintenance is on, visitors only see the maintenance screen, the docs and the about page. Admins
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
                <p className="font-medium">Maintenance screen</p>
                <p className="text-sm text-muted-foreground">
                  {enabled ? "On — the site is closed for visitors." : "Off — the site works normally."}
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
                <Label htmlFor="status">Current status</Label>
                <Textarea
                  id="status"
                  rows={3}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  placeholder="What is happening right now?"
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch id="unknown" checked={unknownEnd} onCheckedChange={setUnknownEnd} disabled={busy} />
                <Label htmlFor="unknown">End time is not known yet</Label>
              </div>

              {!unknownEnd && (
                <div className="space-y-1.5">
                  <Label htmlFor="ends-at">Expected end (your local time)</Label>
                  <Input
                    id="ends-at"
                    type="datetime-local"
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    className="max-w-xs"
                  />
                </div>
              )}

              <Button className="gap-1.5" disabled={busy} onClick={() => void submit()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" aria-hidden="true" />}{" "}
                Save maintenance
              </Button>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
