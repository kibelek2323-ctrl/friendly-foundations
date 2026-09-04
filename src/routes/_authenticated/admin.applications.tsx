import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, Loader2, ShieldAlert, UserRoundCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { amIAdmin } from "@/lib/admin-codes.functions";
import { listDeveloperApplications, reviewDeveloperApplication } from "@/lib/developer-applications.functions";

export const Route = createFileRoute("/_authenticated/admin/applications")({
  head: () => ({
    meta: [
      { title: "Developer applications — Bottly admin" },
      { name: "description", content: "Review developer applications and grant marketplace access on Bottly." },
      { property: "og:title", content: "Developer applications — Bottly admin" },
      { property: "og:description", content: "Review developer applications and grant marketplace access on Bottly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

type StatusFilter = "pending" | "approved" | "rejected" | "all";

function Page() {
  const checkAdmin = useServerFn(amIAdmin);
  const load = useServerFn(listDeveloperApplications);
  const review = useServerFn(reviewDeveloperApplication);

  const { data: isAdmin, isLoading: checking } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin(),
    staleTime: 5 * 60 * 1000,
  });

  const [status, setStatus] = useState<StatusFilter>("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const apps = useQuery({
    queryKey: ["admin-developer-applications", status],
    queryFn: () => load({ data: { status } }),
    enabled: isAdmin === true,
  });

  const act = async (id: string, approve: boolean) => {
    try {
      await review({ data: { id, approve, note: notes[id] ?? "" } });
      toast.success(approve ? "Approved — developer badge granted" : "Application rejected");
      void apps.refetch();
    } catch {
      toast.error("Could not update the application");
    }
  };

  if (checking) {
    return (
      <AppShell title="Applications">
        <div className="flex items-center justify-center p-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Applications">
        <div className="mx-auto max-w-md py-20 text-center">
          <ShieldAlert className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">This area is restricted to Bottly administrators.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Applications">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              <UserRoundCheck className="size-5 text-muted-foreground" aria-hidden="true" /> Developer applications
            </h1>
            <p className="text-sm text-muted-foreground">Approving an application grants the developer badge automatically.</p>
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-44" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <section className="panel divide-y divide-border">
          {apps.isLoading && (
            <div className="flex justify-center p-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          {!apps.isLoading && (apps.data ?? []).length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No applications here.</p>
          )}
          {(apps.data ?? []).map((a) => (
            <article key={a.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{a.applicantName ?? a.userId}</span>
                <Badge variant={a.status === "pending" ? "default" : "outline"} className="capitalize">
                  {a.status}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString()}</span>
              </div>

              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">Experience</dt>
                  <dd className="whitespace-pre-wrap leading-relaxed">{a.experience}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">AI usage</dt>
                  <dd className="whitespace-pre-wrap leading-relaxed">{a.aiUsage}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted-foreground">Motivation</dt>
                  <dd className="whitespace-pre-wrap leading-relaxed">{a.motivation}</dd>
                </div>
              </dl>

              <div className="flex flex-wrap gap-3 text-sm">
                {a.portfolioUrl && (
                  <a href={a.portfolioUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-primary hover:underline">
                    Portfolio <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                )}
                {a.githubUrl && (
                  <a href={a.githubUrl} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-primary hover:underline">
                    GitHub <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>

              {a.status === "pending" && (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={notes[a.id] ?? ""}
                    onChange={(e) => setNotes((p) => ({ ...p, [a.id]: e.target.value }))}
                    placeholder="Optional note for the applicant"
                    maxLength={500}
                    className="max-w-sm"
                    aria-label="Review note"
                  />
                  <Button size="sm" onClick={() => void act(a.id, true)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void act(a.id, false)}>
                    Reject
                  </Button>
                </div>
              )}
              {a.status !== "pending" && a.adminNote && (
                <p className="text-sm text-muted-foreground">Note: {a.adminNote}</p>
              )}
            </article>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
