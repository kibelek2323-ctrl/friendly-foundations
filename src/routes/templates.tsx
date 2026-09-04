import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, Sparkles } from "lucide-react";
import { PublicShell } from "@/components/layout/PublicShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { listPublicTemplates } from "@/lib/templates.functions";

export const Route = createFileRoute("/templates")({
  head: () => ({
    meta: [
      { title: "Discord bot templates — Bottly" },
      {
        name: "description",
        content: "Browse free Bottly flow templates for moderation, ticketing, welcome messages, levels and more.",
      },
      { property: "og:title", content: "Discord bot templates — Bottly" },
      {
        property: "og:description",
        content: "Browse free Bottly flow templates for moderation, ticketing, welcome messages, levels and more.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const fetchTemplates = useServerFn(listPublicTemplates);
  const { data, isLoading } = useQuery({ queryKey: ["public-templates"], queryFn: () => fetchTemplates() });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set((data ?? []).map((t) => t.category))).sort(),
    [data],
  );

  const templates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter((t) => {
      if (category && t.category !== category) return false;
      if (!q) return true;
      return `${t.name} ${t.description}`.toLowerCase().includes(q);
    });
  }, [data, query, category]);

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <Sparkles className="size-6 text-primary" aria-hidden="true" /> Bot templates
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Ready-made flows you can copy into your workspace in one click. Every template is fully editable in the
            visual builder — no code needed.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              className="pl-9"
              placeholder="Search templates"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search templates"
            />
          </div>
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs",
              category === null ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
            )}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs capitalize",
                category === c ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : templates.length === 0 ? (
          <p className="panel p-8 text-center text-sm text-muted-foreground">No templates match that search.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <article key={t.id} className="panel flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold">{t.name}</h2>
                  <Badge variant="secondary" className="capitalize">
                    {t.category}
                  </Badge>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{t.description}</p>
                <p className="text-xs text-muted-foreground">
                  {t.nodeCount} steps · {t.edgeCount} connections
                </p>
                <Button asChild size="sm" className="mt-auto w-full">
                  <Link to="/onboarding">Use this template</Link>
                </Button>
              </article>
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
