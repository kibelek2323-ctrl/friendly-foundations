import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Flag, Loader2, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { amIAdmin } from "@/lib/admin-codes.functions";
import { listReports, resolveReport, setListingPublished } from "@/lib/moderation.functions";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({
    meta: [
      { title: "Moderation queue — Bottly" },
      { name: "description", content: "Review and resolve user reports on Bottly listings and accounts." },
      { property: "og:title", content: "Moderation queue — Bottly" },
      { property: "og:description", content: "Review and resolve user reports on Bottly listings and accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type StatusFilter = "open" | "resolved" | "dismissed" | "all";

function Page() {
  const checkAdmin = useServerFn(amIAdmin);
  const load = useServerFn(listReports);
  const resolve = useServerFn(resolveReport);
  const togglePublished = useServerFn(setListingPublished);

  const { data: isAdmin, isLoading: checking } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin(),
    staleTime: 5 * 60 * 1000,
  });

  const [status, setStatus] = useState<StatusFilter>("open");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const reports = useQuery({
    queryKey: ["admin-reports", status],
    queryFn: () => load({ data: { status } }),
    enabled: isAdmin === true,
  });

  const act = async (id: string, next: "resolved" | "dismissed" | "open") => {
    try {
      await resolve({ data: { id, status: next, note: notes[id] ?? "" } });
      toast.success(`Report marked ${next}`);
      void reports.refetch();
    } catch {
      toast.error("Could not update report");
    }
  };

  if (checking) {
    return (
      <AppShell title="Moderation">
        <div className="flex items-center justify-center p-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Moderation">
        <div className="mx-auto max-w-md py-20 text-center">
          <ShieldAlert className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">This area is restricted to Bottly administrators.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Moderation">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <Flag className="size-5 text-muted-foreground" aria-hidden="true" /> Moderation queue
            </h1>
            <p className="text-sm text-muted-foreground">Reports submitted by users about listings, reviews and accounts.</p>
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-44" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <section className="panel divide-y divide-border">
          {reports.isLoading && (
            <div className="flex justify-center p-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          {(reports.data ?? []).map((r) => (
            <article key={r.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {r.targetType}
                </Badge>
                <span className="text-sm font-medium">{r.targetTitle ?? r.targetId}</span>
                <Badge variant={r.status === "open" ? "default" : "outline"} className="capitalize">
                  {r.status}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {r.reporterName ?? "Unknown"} · {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm">
                <span className="font-medium">{r.reason}</span>
                {r.details ? <span className="text-muted-foreground"> — {r.details}</span> : null}
              </p>
              {r.resolutionNote && <p className="text-xs text-muted-foreground">Note: {r.resolutionNote}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  value={notes[r.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  placeholder="Resolution note (optional)"
                  className="max-w-xs"
                  aria-label="Resolution note"
                />
                {r.targetType === "listing" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await togglePublished({ data: { listingId: r.targetId, published: false } });
                        toast.success("Listing hidden");
                      }}
                    >
                      Hide listing
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        await togglePublished({ data: { listingId: r.targetId, published: true } });
                        toast.success("Listing restored");
                      }}
                    >
                      Restore
                    </Button>
                  </>
                )}
                <Button size="sm" onClick={() => void act(r.id, "resolved")}>
                  Resolve
                </Button>
                <Button variant="outline" size="sm" onClick={() => void act(r.id, "dismissed")}>
                  Dismiss
                </Button>
              </div>
            </article>
          ))}
          {!reports.isLoading && (reports.data ?? []).length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">Nothing to moderate here.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
