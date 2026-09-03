import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { listActiveAnnouncements } from "@/lib/announcements.functions";

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

const services = ["Dashboard & builder", "Bot runtime", "Marketplace", "Authentication", "Cloud storage"];

function Page() {
  const fetchAnnouncements = useServerFn(listActiveAnnouncements);
  const { data, isLoading } = useQuery({ queryKey: ["site-announcements"], queryFn: () => fetchAnnouncements() });
  return <PublicShell><div className="mx-auto max-w-4xl px-4 py-16">
    <div className="flex items-start gap-4 border-b border-border pb-8">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-success/10 text-success"><CheckCircle2 className="size-6" /></span>
      <div><h1 className="text-3xl font-semibold">All systems operational</h1><p className="mt-2 text-sm text-muted-foreground">Current status of Bottly's core services.</p></div>
    </div>
    <section className="py-8"><h2 className="text-sm font-semibold">Services</h2><div className="mt-4 divide-y divide-border border-y border-border">
      {services.map((service) => <div key={service} className="flex items-center justify-between py-4 text-sm"><span>{service}</span><span className="flex items-center gap-2 font-medium text-success"><span className="size-2 rounded-full bg-success" /> Operational</span></div>)}
    </div></section>
    <section className="border-t border-border pt-8"><h2 className="text-sm font-semibold">Latest notices</h2>
      {isLoading ? <Loader2 className="mt-5 size-5 animate-spin text-muted-foreground" /> : (data ?? []).length ? <div className="mt-4 space-y-3">{(data ?? []).map((notice) => <article key={notice.id} className="border-l-2 border-primary py-1 pl-4"><h3 className="text-sm font-medium">{notice.title}</h3><p className="mt-1 text-sm text-muted-foreground">{notice.body}</p></article>)}</div> : <p className="mt-4 text-sm text-muted-foreground">No active service notices.</p>}
    </section>
  </div></PublicShell>;
}