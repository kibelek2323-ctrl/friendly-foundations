import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Newspaper } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { EmptyState } from "@/components/common/EmptyState";
import { listPosts } from "@/lib/blog.functions";

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Bottly blog — Discord bot building guides" },
      { name: "description", content: "Product updates, tutorials and marketplace stories from the Bottly team." },
      { property: "og:title", content: "Bottly blog — Discord bot building guides" },
      { property: "og:description", content: "Product updates, tutorials and marketplace stories from the Bottly team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const fetchPosts = useServerFn(listPosts);
  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts", "blog"],
    queryFn: () => fetchPosts({ data: { kind: "blog" as const } }),
  });

  return (
    <PublicShell>
      <div className="mx-auto max-w-4xl px-4 py-16">
        <p className="text-sm font-medium text-primary">Blog</p>
        <h1 className="mt-2 text-3xl font-semibold">Stories from the Bottly team</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Guides, product deep dives and news about building Discord bots without code.
        </p>

        {isLoading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : !posts || posts.length === 0 ? (
          <div className="mt-12">
            <EmptyState icon={Newspaper} title="No posts yet" description="New articles will show up here soon." />
          </div>
        ) : (
          <div className="mt-10 grid gap-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                to="/blog/$slug"
                params={{ slug: post.slug }}
                className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <p className="text-xs text-muted-foreground">
                  {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString()}
                </p>
                <h2 className="mt-1 text-lg font-medium group-hover:text-primary">{post.title}</h2>
                {post.excerpt ? (
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
