import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BackLink } from "@/components/common/BackLink";
import { PublicShell } from "@/components/layout/PublicShell";
import { DiscordMarkdown } from "@/components/discord/DiscordMarkdown";
import { DOC_CATEGORIES, adjacentDocPages, findDocPage } from "@/data/docs";

export const Route = createFileRoute("/docs/$slug")({
  loader: ({ params }) => {
    const found = findDocPage(params.slug);
    if (!found) throw notFound();
    return { title: found.page.title, summary: found.page.summary };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Docs — Bottly" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.title} — Bottly docs`;
    return {
      meta: [
        { title },
        { name: "description", content: loaderData.summary },
        { property: "og:title", content: title },
        { property: "og:description", content: loaderData.summary },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const found = findDocPage(slug);
  if (!found) return null;
  const { page, category } = found;
  const { prev, next } = adjacentDocPages(slug);

  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <BackLink />

        <div className="mt-8 grid gap-10 md:grid-cols-[240px_minmax(0,1fr)]">
          <nav aria-label="Docs sections" className="h-max md:sticky md:top-20">
            <Link to="/docs" className="text-xs font-medium uppercase tracking-wide text-primary hover:underline">
              All docs
            </Link>
            <ul className="mt-4 space-y-5 text-sm">
              {DOC_CATEGORIES.map((group) => (
                <li key={group.label}>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">{group.label}</p>
                  <ul className="mt-2 space-y-1.5 border-l border-border pl-3">
                    {group.pages.map((p) => (
                      <li key={p.slug}>
                        <Link
                          to="/docs/$slug"
                          params={{ slug: p.slug }}
                          className={
                            p.slug === slug
                              ? "font-medium text-foreground"
                              : "text-muted-foreground transition-colors hover:text-foreground"
                          }
                        >
                          {p.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </nav>

          <article className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">{category.label}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{page.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{page.summary}</p>
            <DiscordMarkdown
              text={page.body}
              flavor="plain"
              className="mt-8 text-sm leading-relaxed text-muted-foreground"
            />

            <div className="mt-12 flex flex-wrap gap-3 border-t border-border pt-6">
              {prev && (
                <Link
                  to="/docs/$slug"
                  params={{ slug: prev.slug }}
                  className="panel flex flex-1 items-center gap-2 p-3 text-sm transition-all hover:-translate-y-0.5 hover:border-primary"
                >
                  <ArrowLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">Previous</span>
                    <span className="block truncate font-medium">{prev.title}</span>
                  </span>
                </Link>
              )}
              {next && (
                <Link
                  to="/docs/$slug"
                  params={{ slug: next.slug }}
                  className="panel flex flex-1 items-center justify-end gap-2 p-3 text-right text-sm transition-all hover:-translate-y-0.5 hover:border-primary"
                >
                  <span className="min-w-0">
                    <span className="block text-xs text-muted-foreground">Next</span>
                    <span className="block truncate font-medium">{next.title}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              )}
            </div>
          </article>
        </div>
      </div>
    </PublicShell>
  );
}
