import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen } from "lucide-react";
import { BackLink } from "@/components/common/BackLink";
import { PublicShell } from "@/components/layout/PublicShell";
import { DOC_CATEGORIES } from "@/data/docs";

export const Route = createFileRoute("/docs/")({
  head: () => ({
    meta: [
      { title: "Docs — build, sell and run Discord bots | Bottly" },
      {
        name: "description",
        content:
          "Complete Bottly documentation: bot wizard, embeds, slash commands, automations, code editor, storage, marketplace, balance, crypto payments and troubleshooting.",
      },
      { property: "og:title", content: "Docs — build, sell and run Discord bots | Bottly" },
      {
        property: "og:description",
        content:
          "Complete Bottly documentation: building bots, selling on the marketplace, billing, security and troubleshooting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-4 py-16">
        <BackLink />
        <div className="mt-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Documentation</h1>
            <p className="text-sm text-muted-foreground">
              Everything from your first bot to selling it on the marketplace.
            </p>
          </div>
        </div>

        <div className="mt-12 space-y-12">
          {DOC_CATEGORIES.map((category) => (
            <section key={category.label}>
              <h2 className="text-xs font-medium uppercase tracking-wide text-primary">{category.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {category.pages.map((page) => (
                  <Link
                    key={page.slug}
                    to="/docs/$slug"
                    params={{ slug: page.slug }}
                    className="group panel flex flex-col p-4 transition-all hover:-translate-y-0.5 hover:border-primary"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      {page.title}
                      <ArrowRight
                        className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{page.summary}</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
