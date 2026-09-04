import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { amIAdmin } from "@/lib/admin-codes.functions";
import {
  getStatusContent,
  saveStatusContent,
  getFaqContent,
  saveFaqContent,
  DEFAULT_STATUS,
  DEFAULT_FAQ,
  type StatusContent,
  type FaqContent,
  type ServiceState,
} from "@/lib/site-content.functions";

export const Route = createFileRoute("/_authenticated/admin/pages")({
  head: () => ({
    meta: [
      { title: "Status & FAQ admin — Bottly" },
      { name: "description", content: "Edit the Bottly status page services and the public FAQ entries." },
      { property: "og:title", content: "Status & FAQ admin — Bottly" },
      { property: "og:description", content: "Edit the Bottly status page services and the public FAQ entries." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const STATES: ServiceState[] = ["operational", "degraded", "down"];

function Page() {
  const checkAdmin = useServerFn(amIAdmin);
  const loadStatus = useServerFn(getStatusContent);
  const loadFaq = useServerFn(getFaqContent);
  const persistStatus = useServerFn(saveStatusContent);
  const persistFaq = useServerFn(saveFaqContent);
  const qc = useQueryClient();

  const { data: isAdmin, isLoading: checking } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin(),
    staleTime: 5 * 60 * 1000,
  });

  const statusQuery = useQuery({ queryKey: ["status-content-admin"], queryFn: () => loadStatus(), enabled: isAdmin === true });
  const faqQuery = useQuery({ queryKey: ["faq-content-admin"], queryFn: () => loadFaq(), enabled: isAdmin === true });

  const [status, setStatus] = useState<StatusContent>(DEFAULT_STATUS);
  const [faq, setFaq] = useState<FaqContent>(DEFAULT_FAQ);
  const [saving, setSaving] = useState<"status" | "faq" | null>(null);

  useEffect(() => { if (statusQuery.data) setStatus(statusQuery.data); }, [statusQuery.data]);
  useEffect(() => { if (faqQuery.data) setFaq(faqQuery.data); }, [faqQuery.data]);

  const saveStatus = async () => {
    setSaving("status");
    try {
      await persistStatus({ data: status });
      qc.invalidateQueries({ queryKey: ["status-content"] });
      toast.success("Status page updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(null);
    }
  };

  const saveFaq = async () => {
    setSaving("faq");
    try {
      await persistFaq({ data: faq });
      qc.invalidateQueries({ queryKey: ["faq-content"] });
      toast.success("FAQ updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(null);
    }
  };

  if (checking) {
    return (
      <AppShell title="Status & FAQ">
        <div className="flex justify-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Status & FAQ">
        <div className="mx-auto max-w-md p-10 text-center">
          <ShieldAlert className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm text-muted-foreground">This area is restricted to administrators.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Status & FAQ">
      <div className="mx-auto max-w-3xl space-y-8 p-4 md:p-6">
        <section className="panel space-y-4 p-5">
          <div>
            <h2 className="text-sm font-semibold">Status page</h2>
            <p className="text-xs text-muted-foreground">Headline, note and the state of each service.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-headline">Headline</Label>
            <Input id="s-headline" value={status.headline} onChange={(e) => setStatus((s) => ({ ...s, headline: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-note">Note</Label>
            <Input id="s-note" value={status.note} onChange={(e) => setStatus((s) => ({ ...s, note: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Services</Label>
            {status.services.map((svc, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={svc.name}
                  aria-label="Service name"
                  onChange={(e) => setStatus((s) => ({ ...s, services: s.services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))}
                />
                <Select
                  value={svc.state}
                  onValueChange={(v) => setStatus((s) => ({ ...s, services: s.services.map((x, j) => (j === i ? { ...x, state: v as ServiceState } : x)) }))}
                >
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove service"
                  onClick={() => setStatus((s) => ({ ...s, services: s.services.filter((_, j) => j !== i) }))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setStatus((s) => ({ ...s, services: [...s.services, { name: "New service", state: "operational" }] }))}
            >
              <Plus className="size-4" /> Add service
            </Button>
          </div>
          <Button disabled={saving === "status"} onClick={() => void saveStatus()}>
            {saving === "status" ? <Loader2 className="size-4 animate-spin" /> : null} Save status page
          </Button>
        </section>

        <section className="panel space-y-4 p-5">
          <div>
            <h2 className="text-sm font-semibold">FAQ</h2>
            <p className="text-xs text-muted-foreground">Questions and answers shown on the public FAQ page.</p>
          </div>
          {faq.items.map((item, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex gap-2">
                <Input
                  value={item.question}
                  aria-label="Question"
                  placeholder="Question"
                  onChange={(e) => setFaq((f) => ({ items: f.items.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)) }))}
                />
                <Button variant="ghost" size="icon" aria-label="Remove question" onClick={() => setFaq((f) => ({ items: f.items.filter((_, j) => j !== i) }))}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <Textarea
                value={item.answer}
                aria-label="Answer"
                placeholder="Answer"
                rows={3}
                onChange={(e) => setFaq((f) => ({ items: f.items.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)) }))}
              />
            </div>
          ))}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setFaq((f) => ({ items: [...f.items, { question: "New question", answer: "Answer" }] }))}>
            <Plus className="size-4" /> Add question
          </Button>
          <div>
            <Button disabled={saving === "faq"} onClick={() => void saveFaq()}>
              {saving === "faq" ? <Loader2 className="size-4 animate-spin" /> : null} Save FAQ
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
