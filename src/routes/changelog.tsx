import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Rocket } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { DiscordMarkdown } from "@/components/discord/DiscordMarkdown";
import { listPosts } from "@/lib/blog.functions";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog — Bottly product updates" },
      { name: "description", content: "Every new feature, improvement and fix shipped to the Bottly Discord bot builder." },
      { property: "og:title", content: "Changelog — Bottly product updates" },
      { property: "og:description", content: "Every new feature, improvement and fix shipped to the Bottly Discord bot builder." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const fetchPosts = useServerFn(listPosts);
  const { data: entries, isLoading } = useQuery({
    queryKey: ["blog-posts", "changelog"],
    queryFn: () => fetchPosts({ data: { kind: "changelog" as const } }),
  });

  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm font-medium text-primary">Changelog</p>
        <h1 className="mt-2 text-3xl font-semibold">What's new in Bottly</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Follow every release of the builder, runtime and marketplace.
        </p>

        {isLoading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : !entries || entries.length === 0 ? (
          <div className="mt-12">
            <EmptyState icon={Rocket} title="No releases published yet" description="Release notes will appear here." />
          </div>
        ) : (
          <ol className="mt-10 space-y-8 border-l border-border pl-6">
            {entries.map((entry) => (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[1.9rem] top-1.5 size-2.5 rounded-full bg-primary" aria-hidden="true" />
                <div className="flex flex-wrap items-center gap-2">
                  {entry.version ? <Badge variant="secondary">{entry.version}</Badge> : null}
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.publishedAt ?? entry.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-medium">{entry.title}</h2>
                {entry.excerpt ? <p className="mt-1 text-sm text-muted-foreground">{entry.excerpt}</p> : null}
                <div className="mt-3">
                  <DiscordMarkdown text={entry.body} className="text-sm leading-relaxed" />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </PublicShell>
  );
}
