import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Loader2, Trash2, Upload, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteListing, myListings, publishListing, setListingPublished, uploadListingImage } from "@/lib/marketplace.functions";
import { usd } from "@/lib/money";
import { useBotStore } from "@/stores/useBotStore";
import { useFlowStore } from "@/stores/useFlowStore";
import { useHydrated } from "@/hooks/useHydrated";

export const Route = createFileRoute("/_authenticated/marketplace/publish")({
  head: () => ({
    meta: [
      { title: "Publish a bot — Bottly marketplace" },
      { name: "description", content: "List one of your Discord bots on the Bottly marketplace and manage your existing listings." },
      { property: "og:title", content: "Publish a bot — Bottly marketplace" },
      { property: "og:description", content: "List one of your Discord bots on the Bottly marketplace and manage your existing listings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function parseLines(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function Page() {
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const bots = useBotStore((s) => s.bots);
  const flows = useFlowStore((s) => s.flows);

  const fetchMine = useServerFn(myListings);
  const publish = useServerFn(publishListing);
  const togglePublished = useServerFn(setListingPublished);
  const remove = useServerFn(deleteListing);

  const mine = useQuery({ queryKey: ["my-listings"], queryFn: () => fetchMine() });

  const sellable = bots.filter((b) => !b.purchased);
  const [botId, setBotId] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [tags, setTags] = useState("");
  const [price, setPrice] = useState(0);
  const [busy, setBusy] = useState(false);

  const upload = useServerFn(uploadListingImage);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = 6 - images.length;
    if (room <= 0) {
      toast.error("You can attach up to 6 images.");
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, room)) {
        if (file.size > 5_000_000) {
          toast.error(`${file.name} is larger than 5 MB.`);
          continue;
        }
        const buffer = await file.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i += 8192) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        }
        const res = await upload({
          data: { fileName: file.name, contentType: file.type || "image/png", dataBase64: btoa(binary) },
        });
        if (res.ok && res.url) setImages((prev) => [...prev, res.url as string]);
        else toast.error(res.error ?? "Upload failed.");
      }
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    const bot = bots.find((b) => b.id === botId);
    if (!bot) {
      toast.error("Pick a bot to publish.");
      return;
    }
    if (title.trim().length < 3) {
      toast.error("Title needs at least 3 characters.");
      return;
    }

    setBusy(true);
    try {
      const flow = bot.flowId ? (flows[bot.flowId] ?? null) : null;
      const res = await publish({
        data: {
          botId: bot.id,
          title: title.trim(),
          summary: summary.trim(),
          description,
          images,
          tags: parseLines(tags).slice(0, 6),
          price: Math.max(0, Math.round(price)),
          botData: bot as unknown as Record<string, unknown>,
          flowData: flow ? (flow as unknown as Record<string, unknown>) : null,
        },
      });
      if (!res.ok) {
        toast.error(res.error ?? "Could not publish this bot.");
        return;
      }
      toast.success("Listing created — publish it below when you're ready.");
      setTitle("");
      setSummary("");
      setDescription("");
      setImages([]);
      setTags("");
      setPrice(0);
      void mine.refetch();
    } catch {
      toast.error("Could not publish this bot.");
    } finally {
      setBusy(false);
    }
  };


  return (
    <AppShell title="Publish a bot">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/marketplace">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to marketplace
          </Link>
        </Button>

        <div>
          <h1 className="text-xl font-semibold">Publish a bot</h1>
          <p className="text-sm text-muted-foreground">
            A snapshot of the bot (commands, components, automations and its flow) is copied into the listing. Buyers can
            re-skin it, but the logic stays locked.
          </p>
        </div>

        <section className="panel space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-bot">Bot</Label>
              <Select value={botId} onValueChange={setBotId}>
                <SelectTrigger id="m-bot">
                  <SelectValue placeholder={hydrated && sellable.length === 0 ? "No bots to publish" : "Pick a bot"} />
                </SelectTrigger>
                <SelectContent>
                  {sellable.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-price">Price (USD, 0 = free)</Label>
              <Input
                id="m-price"
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="m-title">Title</Label>
              <Input id="m-title" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Moderation suite" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="m-summary">Short summary</Label>
              <Input
                id="m-summary"
                maxLength={160}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Auto-mod, warnings and logging in one bot."
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="m-desc">Description (Markdown)</Label>
              <Textarea
                id="m-desc"
                rows={8}
                maxLength={8000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={"## What it does\n- /warn, /mute, /purge\n- Logs everything to a channel"}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="m-images">Screenshots (up to 6, max 5 MB each)</Label>
              <Input
                id="m-images"
                type="file"
                accept="image/*"
                multiple
                disabled={uploading || images.length >= 6}
                onChange={(e) => {
                  void onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              {uploading && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Uploading…
                </p>
              )}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {images.map((src, i) => (
                    <div key={src} className="relative size-20 overflow-hidden rounded-md border border-border">
                      <img src={src} alt={`Screenshot ${i + 1}`} className="size-full object-cover" />
                      <button
                        type="button"
                        aria-label={`Remove screenshot ${i + 1}`}
                        onClick={() => setImages((prev) => prev.filter((u) => u !== src))}
                        className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-background/90 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m-tags">Tags (comma separated, max 6)</Label>
              <Textarea id="m-tags" rows={3} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="moderation, logging" />
            </div>
          </div>

          <Button className="gap-1.5" disabled={busy || !botId} onClick={() => void submit()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" aria-hidden="true" />} Create listing
          </Button>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">My listings</h2>
          <div className="panel divide-y divide-border">
            {mine.isLoading && (
              <div className="flex justify-center p-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
              </div>
            )}
            {(mine.data ?? []).map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="mr-auto min-w-0">
                  <p className="truncate font-medium">{l.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {l.price === 0 ? "Free" : usd(l.price)} · {l.salesCount} purchases
                  </p>
                </div>
                <Badge variant={l.published ? "default" : "secondary"}>{l.published ? "Published" : "Draft"}</Badge>
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => void navigate({ to: "/marketplace/$listingId", params: { listingId: l.id } })}>
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={async () => {
                    await togglePublished({ data: { id: l.id, published: !l.published } });
                    void mine.refetch();
                  }}
                >
                  {l.published ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  {l.published ? "Unpublish" : "Publish"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${l.title}`}
                  onClick={async () => {
                    await remove({ data: { id: l.id } });
                    toast.success("Listing deleted");
                    void mine.refetch();
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
            {!mine.isLoading && (mine.data ?? []).length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">You haven't listed any bots yet.</p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
