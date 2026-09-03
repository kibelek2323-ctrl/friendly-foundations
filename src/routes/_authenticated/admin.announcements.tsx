import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { amIAdmin } from "@/lib/admin-codes.functions";
import {
  deleteAnnouncement,
  listAnnouncements,
  saveAnnouncement,
  setAnnouncementActive,
  type AnnouncementKind,
  type AnnouncementVariant,
} from "@/lib/announcements.functions";

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements admin — Bottly" },
      { name: "description", content: "Publish homepage popups and announcement bars for Bottly visitors." },
      { property: "og:title", content: "Announcements admin — Bottly" },
      { property: "og:description", content: "Publish homepage popups and announcement bars for Bottly visitors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const checkAdmin = useServerFn(amIAdmin);
  const list = useServerFn(listAnnouncements);
  const save = useServerFn(saveAnnouncement);
  const toggle = useServerFn(setAnnouncementActive);
  const remove = useServerFn(deleteAnnouncement);

  const { data: isAdmin, isLoading: checking } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin(),
    staleTime: 5 * 60 * 1000,
  });

  const items = useQuery({
    queryKey: ["announcements-admin"],
    queryFn: () => list(),
    enabled: isAdmin === true,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<AnnouncementKind>("bar");
  const [variant, setVariant] = useState<AnnouncementVariant>("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setEditingId(null);
    setKind("bar");
    setVariant("info");
    setTitle("");
    setBody("");
    setCtaLabel("");
    setCtaUrl("");
  };

  const submit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setBusy(true);
    try {
      await save({
        data: {
          id: editingId,
          kind,
          title: title.trim(),
          body: body.trim(),
          ctaLabel: ctaLabel.trim() || null,
          ctaUrl: ctaUrl.trim() || null,
          variant,
          active: true,
        },
      });
      toast.success(editingId ? "Announcement updated" : "Announcement published");
      reset();
      void items.refetch();
    } catch {
      toast.error("Could not save announcement");
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <AppShell title="Announcements">
        <div className="flex items-center justify-center p-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Announcements">
        <div className="mx-auto max-w-md py-20 text-center">
          <ShieldAlert className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">This area is restricted to Bottly administrators.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Announcements">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-xl font-semibold">Homepage announcements</h1>
          <p className="text-sm text-muted-foreground">
            Publish a top announcement bar or a popup that greets visitors on the homepage.
          </p>
        </div>

        <section className="panel grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="a-kind">Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as AnnouncementKind)}>
              <SelectTrigger id="a-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Announcement bar</SelectItem>
                <SelectItem value="popup">Entry popup</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-variant">Style</Label>
            <Select value={variant} onValueChange={(v) => setVariant(v as AnnouncementVariant)}>
              <SelectTrigger id="a-variant">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="promo">Promo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="a-title">Title</Label>
            <Input id="a-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Marketplace is live!" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="a-body">Message</Label>
            <Textarea id="a-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-cta">Button label (optional)</Label>
            <Input id="a-cta" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Browse the marketplace" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-url">Button link (optional)</Label>
            <Input id="a-url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="/marketplace" />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button disabled={busy} onClick={() => void submit()} className="gap-1.5">
              {busy && <Loader2 className="size-4 animate-spin" />} {editingId ? "Save changes" : "Publish"}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
            )}
          </div>
        </section>

        <section className="panel divide-y divide-border">
          {items.isLoading && (
            <div className="flex justify-center p-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          {(items.data ?? []).map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-3 p-4">
              <Badge variant="secondary">{a.kind === "bar" ? "Bar" : "Popup"}</Badge>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.title}</p>
                <p className="truncate text-xs text-muted-foreground">{a.body}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingId(a.id);
                    setKind(a.kind);
                    setVariant(a.variant);
                    setTitle(a.title);
                    setBody(a.body);
                    setCtaLabel(a.ctaLabel ?? "");
                    setCtaUrl(a.ctaUrl ?? "");
                  }}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await toggle({ data: { id: a.id, active: !a.active } });
                    void items.refetch();
                  }}
                >
                  {a.active ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete announcement"
                  onClick={async () => {
                    await remove({ data: { id: a.id } });
                    void items.refetch();
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          {!items.isLoading && (items.data ?? []).length === 0 && (
            <p className="p-8 text-center text-sm text-muted-foreground">No announcements yet.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
