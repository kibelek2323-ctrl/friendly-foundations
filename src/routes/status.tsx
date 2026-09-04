import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { listActiveAnnouncements } from "@/lib/announcements.functions";
import { getStatusContent, DEFAULT_STATUS, type ServiceState } from "@/lib/site-content.functions";

export const Route = createFileRoute("/status")({
  head: () => ({ meta: [
    { title: "Service Status — Bottly" },
    { name: "description", content: "Current availability and service notices for the Bottly Discord bot platform." },
    { property: "og:title", content: "Service Status — Bottly" },
    { property: "og:description", content: "Current availability and service notices for the Bottly Discord bot platform." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: Page,
});

const STATE_LABEL: Record<ServiceState, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Outage",
};
const STATE_CLASS: Record<ServiceState, string> = {
  operational: "text-success",
  degraded: "text-warning",
  down: "text-destructive",
};
const STATE_DOT: Record<ServiceState, string> = {
  operational: "bg-success",
  degraded: "bg-warning",
  down: "bg-destructive",
};

function Page() {
  const fetchAnnouncements = useServerFn(listActiveAnnouncements);
  const fetchStatus = useServerFn(getStatusContent);
  const { data, isLoading } = useQuery({ queryKey: ["site-announcements"], queryFn: () => fetchAnnouncements() });
  const { data: content } = useQuery({ queryKey: ["status-content"], queryFn: () => fetchStatus() });
  const status = content ?? DEFAULT_STATUS;
  const worst: ServiceState = status.services.some((s) => s.state === "down")
    ? "down"
    : status.services.some((s) => s.state === "degraded")
      ? "degraded"
      : "operational";
  const HeadIcon = worst === "operational" ? CheckCircle2 : worst === "degraded" ? AlertTriangle : XCircle;

  return <PublicShell><div className="mx-auto max-w-4xl px-4 py-16">
    <div className="flex items-start gap-4 border-b border-border pb-8">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-md bg-elevated ${STATE_CLASS[worst]}`}><HeadIcon className="size-6" /></span>
      <div><h1 className="text-3xl font-semibold">{status.headline}</h1><p className="mt-2 text-sm text-muted-foreground">{status.note}</p></div>
    </div>
    <section className="py-8"><h2 className="text-sm font-semibold">Services</h2><div className="mt-4 divide-y divide-border border-y border-border">
      {status.services.map((service) => (
        <div key={service.name} className="flex items-center justify-between py-4 text-sm">
          <span>{service.name}</span>
          <span className={`flex items-center gap-2 font-medium ${STATE_CLASS[service.state]}`}>
            <span className={`size-2 rounded-full ${STATE_DOT[service.state]}`} /> {STATE_LABEL[service.state]}
          </span>
        </div>
      ))}
    </div></section>
    <section className="border-t border-border pt-8"><h2 className="text-sm font-semibold">Latest notices</h2>
      {isLoading ? <Loader2 className="mt-5 size-5 animate-spin text-muted-foreground" /> : (data ?? []).length ? <div className="mt-4 space-y-3">{(data ?? []).map((notice) => <article key={notice.id} className="border-l-2 border-primary py-1 pl-4"><h3 className="text-sm font-medium">{notice.title}</h3><p className="mt-1 text-sm text-muted-foreground">{notice.body}</p></article>)}</div> : <p className="mt-4 text-sm text-muted-foreground">No active service notices.</p>}
    </section>
  </div></PublicShell>;
}
