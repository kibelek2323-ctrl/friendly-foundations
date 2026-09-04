import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Banknote, Check, Loader2, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminListPayouts, adminResolvePayout } from "@/lib/payouts.functions";
import { usd } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/admin/payouts")({
  head: () => ({
    meta: [
      { title: "Payout requests — Bottly admin" },
      { name: "description", content: "Review and settle creator payout requests." },
      { property: "og:title", content: "Payout requests — Bottly admin" },
      { property: "og:description", content: "Review and settle creator payout requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const fetchPayouts = useServerFn(adminListPayouts);
  const resolve = useServerFn(adminResolvePayout);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["admin-payouts"], queryFn: () => fetchPayouts() });
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, approve: boolean) => {
    setBusy(id);
    try {
      const res = await resolve({ data: { id, approve, note: notes[id] ?? "" } });
      if (!res.ok) {
        toast.error(res.error ?? "Could not update the payout.");
        return;
      }
      toast.success(approve ? "Marked as paid." : "Rejected and refunded.");
      void refetch();
    } catch {
      toast.error("Could not update the payout.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell title="Payouts">
      <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Banknote className="size-5 text-success" aria-hidden="true" /> Payout requests
          </h1>
          <p className="text-sm text-muted-foreground">Approving marks it as paid; rejecting refunds the creator's balance.</p>
        </div>

        <div className="panel divide-y divide-border">
          {isLoading && (
            <div className="flex justify-center p-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          {(data ?? []).map((p) => (
            <div key={p.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="mr-auto min-w-0">
                  <p className="font-medium">
                    {usd(p.amount)} · {p.userName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.method} · {p.destination} · {new Date(p.createdAt).toLocaleString()}
                  </p>
                </div>
                <Badge variant={p.status === "paid" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                  {p.status}
                </Badge>
              </div>
              {p.status === "pending" ? (
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={notes[p.id] ?? ""}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    placeholder="Note (optional)"
                    className="max-w-sm"
                    aria-label="Payout note"
                  />
                  <Button size="sm" className="gap-1.5" disabled={busy === p.id} onClick={() => void act(p.id, true)}>
                    <Check className="size-4" aria-hidden="true" /> Mark paid
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={busy === p.id}
                    onClick={() => void act(p.id, false)}
                  >
                    <X className="size-4" aria-hidden="true" /> Reject & refund
                  </Button>
                </div>
              ) : (
                p.note && <p className="text-xs text-muted-foreground">{p.note}</p>
              )}
            </div>
          ))}
          {!isLoading && (data ?? []).length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No payout requests yet.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
