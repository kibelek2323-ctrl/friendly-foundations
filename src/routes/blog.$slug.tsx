import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PublicShell } from "@/components/layout/PublicShell";
import { Button } from "@/components/ui/button";
import { DiscordMarkdown } from "@/components/discord/DiscordMarkdown";
import { getPost } from "@/lib/blog.functions";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getPost({ data: { slug: params.slug } });
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Post unavailable — Bottly" }, { name: "robots", content: "noindex" }] };
    }
    const { title, excerpt } = loaderData.post;
    const description = excerpt || `Read “${title}” on the Bottly blog.`;
    return {
      meta: [
        { title: `${title} — Bottly blog` },
        { name: "description", content: description },
        { property: "og:title", content: `${title} — Bottly blog` },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  errorComponent: () => <Fallback title="Something went wrong" />,
  notFoundComponent: () => <Fallback title="Post not found" />,
  component: Page,
});

function Fallback({ title }: { title: string }) {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/blog">Back to blog</Link>
        </Button>
      </div>
    </PublicShell>
  );
}

function Page() {
  const { post } = Route.useLoaderData();
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-4 py-16">
        <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground">
          ← Blog
        </Link>
        <p className="mt-6 text-xs text-muted-foreground">
          {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString()}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{post.title}</h1>
        {post.excerpt ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p> : null}
        {post.coverUrl ? (
          <img src={post.coverUrl} alt={post.title} className="mt-8 w-full rounded-xl border border-border" loading="lazy" />
        ) : null}
        <div className="mt-8 border-t border-border pt-8">
          <DiscordMarkdown text={post.body || "_No content yet._"} flavor="plain" className="text-sm leading-relaxed" />
        </div>
      </article>
    </PublicShell>
  );
}
