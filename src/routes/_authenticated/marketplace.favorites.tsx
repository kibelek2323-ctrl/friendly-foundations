import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, Loader2, Store } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/marketplace/StarRating";
import { listMyFavorites } from "@/lib/marketplace.functions";
import { usd } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/marketplace/favorites")({
  head: () => ({
    meta: [
      { title: "Saved bots — Bottly" },
      { name: "description", content: "Every marketplace bot you saved for later, in one place." },
      { property: "og:title", content: "Saved bots — Bottly" },
      { property: "og:description", content: "Every marketplace bot you saved for later, in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const fetchFavorites = useServerFn(listMyFavorites);
  const { data, isLoading } = useQuery({ queryKey: ["my-favorite-listings"], queryFn: () => fetchFavorites() });

  return (
    <AppShell title="Saved bots">
      <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Heart className="size-5 text-destructive" aria-hidden="true" /> Saved bots
          </h1>
          <p className="text-sm text-muted-foreground">Bots you bookmarked on the marketplace.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : (data ?? []).length === 0 ? (
          <div className="panel p-10 text-center">
            <Store className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground">Nothing saved yet.</p>
            <Button asChild className="mt-4">
              <Link to="/marketplace">Browse the marketplace</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data ?? []).map((l) => (
              <Link
                key={l.id}
                to="/marketplace/$listingId"
                params={{ listingId: l.id }}
                className="panel overflow-hidden transition hover:border-primary/60"
              >
                {l.images[0] ? (
                  <img src={l.images[0]} alt={l.title} className="aspect-video w-full object-cover" />
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-elevated">
                    <Store className="size-8 text-muted-foreground" aria-hidden="true" />
                  </div>
                )}
                <div className="space-y-2 p-4">
                  <p className="truncate font-medium">{l.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{l.summary}</p>
                  <div className="flex items-center gap-2">
                    <StarRating value={l.rating} count={l.reviewCount} />
                    <Badge variant="secondary" className="ml-auto">
                      {l.price === 0 ? "Free" : usd(l.price)}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
