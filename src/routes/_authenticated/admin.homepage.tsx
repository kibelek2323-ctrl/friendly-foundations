import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { amIAdmin } from "@/lib/admin-codes.functions";
import { ANNOUNCEMENT_ICON_KEYS, announcementIcon } from "@/lib/announcement-icons";
import { getHomepageContent, saveHomepageContent, DEFAULT_HOMEPAGE, type HomepageContent } from "@/lib/site-content.functions";

export const Route = createFileRoute("/_authenticated/admin/homepage")({
  head: () => ({
    meta: [
      { title: "Homepage content admin — Bottly" },
      { name: "description", content: "Edit the Bottly homepage hero, badge and stats." },
      { property: "og:title", content: "Homepage content admin — Bottly" },
      { property: "og:description", content: "Edit the Bottly homepage hero, badge and stats." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const checkAdmin = useServerFn(amIAdmin);
  const load = useServerFn(getHomepageContent);
  const save = useServerFn(saveHomepageContent);
  const qc = useQueryClient();

  const { data: isAdmin, isLoading: checking } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin(),
    staleTime: 5 * 60 * 1000,
  });

  const content = useQuery({
    queryKey: ["homepage-content-admin"],
    queryFn: () => load(),
    enabled: isAdmin === true,
  });

  const [form, setForm] = useState<HomepageContent>(DEFAULT_HOMEPAGE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (content.data) setForm(content.data);
  }, [content.data]);

  const set = <K extends keyof HomepageContent>(key: K, value: HomepageContent[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setStat = (i: number, field: "value" | "label", v: string) =>
    setForm((f) => ({ ...f, stats: f.stats.map((s, j) => (j === i ? { ...s, [field]: v } : s)) }));

  const onSave = async () => {
    setSaving(true);
    try {
      await save({ data: form });
      qc.invalidateQueries({ queryKey: ["homepage-content"] });
      toast.success("Homepage updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (checking || (isAdmin && content.isLoading)) {
    return (
      <AppShell title="Homepage">
        <div className="flex justify-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Homepage">
        <div className="mx-auto max-w-md py-20 text-center">
          <ShieldAlert className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Admins only.</p>
        </div>
      </AppShell>
    );
  }

  const BadgeIcon = announcementIcon(form.badgeIcon);

  return (
    <AppShell title="Homepage">
      <div className="mx-auto max-w-2xl space-y-6 p-6">
        <div>
          <h1 className="text-xl font-semibold">Homepage hero</h1>
          <p className="mt-1 text-sm text-muted-foreground">Edit the landing page badge, headline, subtext and stats.</p>
        </div>

        <div className="panel space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <div className="space-y-1.5">
              <Label htmlFor="badgeText">Badge text</Label>
              <Input id="badgeText" value={form.badgeText} onChange={(e) => set("badgeText", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Badge icon</Label>
              <Select value={form.badgeIcon} onValueChange={(v) => set("badgeIcon", v)}>
                <SelectTrigger>
                  <span className="flex items-center gap-2"><BadgeIcon className="size-4 text-primary" /><SelectValue /></span>
                </SelectTrigger>
                <SelectContent>
                  {ANNOUNCEMENT_ICON_KEYS.map((k) => {
                    const I = announcementIcon(k);
                    return (
                      <SelectItem key={k} value={k}>
                        <span className="flex items-center gap-2"><I className="size-4" /> {k}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="headlineBefore">Headline</Label>
              <Input id="headlineBefore" value={form.headlineBefore} onChange={(e) => set("headlineBefore", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="headlineAccent">Highlighted word</Label>
              <Input id="headlineAccent" value={form.headlineAccent} onChange={(e) => set("headlineAccent", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="subtext">Subtext</Label>
            <Textarea id="subtext" rows={3} value={form.subtext} onChange={(e) => set("subtext", e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Stats</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              {form.stats.map((s, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-border p-3">
                  <Input value={s.value} onChange={(e) => setStat(i, "value", e.target.value)} placeholder="120k+" />
                  <Input value={s.label} onChange={(e) => setStat(i, "label", e.target.value)} placeholder="bots built" />
                </div>
              ))}
            </div>
          </div>

          <Button onClick={onSave} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-4 animate-spin" />} Save homepage
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
