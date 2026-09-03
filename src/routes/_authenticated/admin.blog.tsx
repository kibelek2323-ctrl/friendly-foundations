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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DiscordMarkdown } from "@/components/discord/DiscordMarkdown";
import { amIAdmin } from "@/lib/admin-codes.functions";
import { adminListPosts, deletePost, savePost, type BlogPost, type PostKind } from "@/lib/blog.functions";

export const Route = createFileRoute("/_authenticated/admin/blog")({
  head: () => ({
    meta: [
      { title: "Blog admin — Bottly" },
      { name: "description", content: "Write blog articles and changelog entries for the Bottly site." },
      { property: "og:title", content: "Blog admin — Bottly" },
      { property: "og:description", content: "Write blog articles and changelog entries for the Bottly site." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function Page() {
  const checkAdmin = useServerFn(amIAdmin);
  const list = useServerFn(adminListPosts);
  const save = useServerFn(savePost);
  const remove = useServerFn(deletePost);

  const { data: isAdmin, isLoading: checking } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin(),
    staleTime: 5 * 60 * 1000,
  });

  const posts = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: () => list(),
    enabled: isAdmin === true,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [kind, setKind] = useState<PostKind>("blog");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [version, setVersion] = useState("");
  const [published, setPublished] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setEditingId(null);
    setKind("blog");
    setSlug("");
    setTitle("");
    setExcerpt("");
    setBody("");
    setCoverUrl("");
    setVersion("");
    setPublished(false);
  };

  const edit = (post: BlogPost) => {
    setEditingId(post.id);
    setKind(post.kind);
    setSlug(post.slug);
    setTitle(post.title);
    setExcerpt(post.excerpt);
    setBody(post.body);
    setCoverUrl(post.coverUrl ?? "");
    setVersion(post.version ?? "");
    setPublished(post.published);
  };

  const submit = async () => {
    const finalSlug = slug.trim() || slugify(title);
    if (!title.trim() || !finalSlug) {
      toast.error("Title and slug are required");
      return;
    }
    setBusy(true);
    try {
      const res = await save({
        data: {
          id: editingId,
          kind,
          slug: finalSlug,
          title: title.trim(),
          excerpt: excerpt.trim(),
          body,
          coverUrl: coverUrl.trim() || null,
          version: version.trim() || null,
          published,
        },
      });
      if (!res.ok) {
        toast.error(res.error ?? "Could not save post");
        return;
      }
      toast.success(editingId ? "Post updated" : "Post created");
      reset();
      await posts.refetch();
    } catch {
      toast.error("Could not save post");
    } finally {
      setBusy(false);
    }
  };

  const destroy = async (id: string) => {
    const res = await remove({ data: { id } });
    if (!res.ok) {
      toast.error(res.error ?? "Could not delete post");
      return;
    }
    if (editingId === id) reset();
    toast.success("Post deleted");
    await posts.refetch();
  };

  if (checking) {
    return (
      <AppShell title="Blog">
        <div className="flex justify-center py-20">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      </AppShell>
    );
  }

  if (isAdmin !== true) {
    return (
      <AppShell title="Blog">
        <div className="mx-auto max-w-md py-20 text-center">
          <ShieldAlert className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-medium">Admins only</h2>
          <p className="mt-1 text-sm text-muted-foreground">This account does not have administrator access.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Blog">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-medium">{editingId ? "Edit post" : "New post"}</h2>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as PostKind)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blog">Blog article</SelectItem>
                    <SelectItem value="changelog">Changelog entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="version">Version (changelog)</Label>
                <Input id="version" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1.4.0" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!editingId) setSlug(slugify(e.target.value));
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea id="excerpt" rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cover">Cover image URL</Label>
              <Input id="cover" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="body">Body (markdown)</Label>
              <Textarea id="body" rows={12} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-xs" />
            </div>

            {body ? (
              <div className="rounded-lg border border-border bg-background p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
                <DiscordMarkdown text={body} className="text-sm leading-relaxed" />
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <Switch id="published" checked={published} onCheckedChange={setPublished} />
              <Label htmlFor="published">Published</Label>
            </div>

            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => void submit()}>
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : editingId ? "Save changes" : "Create post"}
              </Button>
              {editingId ? (
                <Button variant="ghost" onClick={reset}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-medium">All posts</h2>
          {posts.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
          ) : !posts.data || posts.data.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No posts yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {posts.data.map((post) => (
                <li key={post.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" className="text-left" onClick={() => edit(post)}>
                      <p className="text-sm font-medium">{post.title}</p>
                      <p className="text-xs text-muted-foreground">/{post.slug}</p>
                    </button>
                    <Button variant="ghost" size="icon" onClick={() => void destroy(post.id)} aria-label="Delete post">
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <Badge variant="secondary">{post.kind}</Badge>
                    <Badge variant={post.published ? "default" : "outline"}>{post.published ? "Published" : "Draft"}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
