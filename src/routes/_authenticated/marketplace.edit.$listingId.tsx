import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getListingForEdit,
  updateListing,
  uploadMarketplaceImage,
  LISTING_CATEGORIES,
  type ListingCategory,
} from "@/lib/marketplace.functions";

export const Route = createFileRoute("/_authenticated/marketplace/edit/$listingId")({
  head: () => ({
    meta: [
      { title: "Edit listing — Bottly marketplace" },
      { name: "description", content: "Update your Bottly marketplace listing and publish a new version with a changelog." },
      { property: "og:title", content: "Edit listing — Bottly marketplace" },
      { property: "og:description", content: "Update your Bottly marketplace listing and publish a new version with a changelog." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { listingId } = useParams({ from: "/_authenticated/marketplace/edit/$listingId" });
  const navigate = useNavigate();
  const fetchListing = useServerFn(getListingForEdit);
  const save = useServerFn(updateListing);
  const uploadImage = useServerFn(uploadMarketplaceImage);

  const { data, isLoading } = useQuery({
    queryKey: ["listing-edit", listingId],
    queryFn: () => fetchListing({ data: { id: listingId } }),
  });

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState<ListingCategory>("other");
  const [changelog, setChangelog] = useState("");
  const [images, setImages] = useState<{ path: string; previewUrl: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setTitle(data.title);
    setSummary(data.summary);
    setDescription(data.description);
    setTags(data.tags.join(", "));
    setPrice(data.price);
    setCategory(data.category as ListingCategory);
    setImages(data.imagePaths.map((path, i) => ({ path, previewUrl: data.images[i] ?? path })));
  }, [data]);

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
        const form = new FormData();
        form.set("file", file);
        const uploaded = await uploadImage({ data: form });
        setImages((prev) => [...prev, { path: uploaded.path, previewUrl: uploaded.signedUrl }]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? `Upload failed: ${error.message}` : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (title.trim().length < 3) {
      toast.error("Title needs at least 3 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await save({
        data: {
          id: listingId,
          title: title.trim(),
          summary: summary.trim(),
          description,
          images: images.map((i) => i.path),
          tags: tags
            .split(/[\n,]/)
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 6),
          price: Math.max(0, Math.round(price)),
          category,
          changelog: changelog.trim(),
        },
      });
      if (!res.ok) {
        toast.error(res.error ?? "Could not save the changes.");
        return;
      }
      toast.success(`Saved as version ${res.version}.`);
      void navigate({ to: "/marketplace/$listingId", params: { listingId } });
    } catch {
      toast.error("Could not save the changes.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Edit listing">
      <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/marketplace/$listingId" params={{ listingId }}>
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to listing
          </Link>
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : !data ? (
          <p className="panel p-10 text-center text-sm text-muted-foreground">This listing is not yours or no longer exists.</p>
        ) : (
          <section className="panel space-y-4 p-5">
            <div>
              <h1 className="text-xl font-semibold">Edit listing</h1>
              <p className="text-sm text-muted-foreground">
                Currently at version {data.version}. Saving publishes a new version and adds your notes to the update history.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="e-price">Price (USD, 0 = free)</Label>
                <Input id="e-price" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-category">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ListingCategory)}>
                  <SelectTrigger id="e-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LISTING_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="e-title">Title</Label>
                <Input id="e-title" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="e-summary">Short summary</Label>
                <Input id="e-summary" maxLength={160} value={summary} onChange={(e) => setSummary(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="e-desc">Description (Markdown)</Label>
                <Textarea id="e-desc" rows={8} maxLength={8000} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="e-images">Screenshots (up to 6, max 5 MB each)</Label>
                <Input
                  id="e-images"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading || images.length >= 6}
                  onChange={(e) => {
                    void onFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {images.map((image, i) => (
                      <div key={image.path} className="relative size-20 overflow-hidden rounded-md border border-border">
                        <img src={image.previewUrl} alt={`Screenshot ${i + 1}`} className="size-full object-cover" />
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          aria-label={`Remove screenshot ${i + 1}`}
                          onClick={() => setImages((prev) => prev.filter((item) => item.path !== image.path))}
                          className="absolute right-1 top-1 size-6"
                        >
                          <X className="size-3" aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="e-tags">Tags (comma separated, max 6)</Label>
                <Input id="e-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="e-changelog">What changed in this version?</Label>
                <Textarea
                  id="e-changelog"
                  rows={3}
                  maxLength={1000}
                  value={changelog}
                  onChange={(e) => setChangelog(e.target.value)}
                  placeholder="Added a ticket transcript command and fixed the welcome embed."
                />
              </div>
            </div>

            <Button className="gap-1.5" disabled={busy} onClick={() => void submit()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" aria-hidden="true" />}
              Save version {data.version + 1}
            </Button>
          </section>
        )}
      </div>
    </AppShell>
  );
}
