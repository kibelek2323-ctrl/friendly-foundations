import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, Store, Upload, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BadgeIcons } from "@/components/profile/ProfileBadges";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PublicShell } from "@/components/layout/PublicShell";
import { EmptyState } from "@/components/common/EmptyState";
import { StarRating } from "@/components/marketplace/StarRating";
import { listMarketplace, getMyBalance, LISTING_CATEGORIES } from "@/lib/marketplace.functions";
import { useAuthStore } from "@/stores/useAuthStore";
import { usd } from "@/lib/money";

type SortKey = "newest" | "rating" | "bestsellers" | "price-asc" | "price-desc";

const SORT_LABELS: Record<SortKey, string> = {
  newest: "Newest",
  rating: "Top rated",
  bestsellers: "Best sellers",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
};


export const Route = createFileRoute("/marketplace/")({
  head: () => ({
    meta: [
      { title: "Bot marketplace — Bottly" },
      { name: "description", content: "Browse Discord bots published by the Bottly community and add them to your workspace." },
      { property: "og:title", content: "Bot marketplace — Bottly" },
      { property: "og:description", content: "Browse Discord bots published by the Bottly community and add them to your workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const fetchListings = useServerFn(listMarketplace);
  const fetchBalance = useServerFn(getMyBalance);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [freeOnly, setFreeOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");

  const maxPriceCents = (() => {
    const parsed = Number.parseFloat(maxPrice);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
  })();

  const { data: listings, isLoading } = useQuery({
    queryKey: ["marketplace", category, sort, freeOnly, maxPriceCents],
    queryFn: () =>
      fetchListings({
        data: {
          category: category === "all" ? null : category,
          sort,
          freeOnly,
          maxPrice: maxPriceCents,
          sellerId: null,
        },
      }),
  });
  const { data: balance } = useQuery({ queryKey: ["my-balance"], queryFn: () => fetchBalance(), enabled: !!user });

  const items = (listings ?? []).filter(
    (l) =>
      l.title.toLowerCase().includes(q.toLowerCase()) ||
      l.summary.toLowerCase().includes(q.toLowerCase()) ||
      l.tags.some((t) => t.toLowerCase().includes(q.toLowerCase())),
  );


  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="text-2xl font-semibold tracking-tight">Bot marketplace</h1>
            <p className="text-sm text-muted-foreground">
              Buy ready-made bots with your balance. Purchased bots can be re-skinned, but their logic stays locked.
            </p>
          </div>
          {user ? (
            <>
              <span className="flex items-center gap-1.5 rounded-md border border-border bg-elevated px-3 py-1.5 text-sm font-medium">
                <Wallet className="size-4 text-success" aria-hidden="true" />
                {usd(balance?.balance ?? 0)}
              </span>
              <Button size="sm" className="gap-1.5" onClick={() => void navigate({ to: "/marketplace/publish" })}>
                <Upload className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Publish a bot</span>
              </Button>
            </>
          ) : (
            <Button size="sm" asChild>
              <Link to="/register">Create a free account</Link>
            </Button>
          )}
        </div>

        <div className="panel flex flex-wrap items-end gap-3 p-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search bots" aria-label="Search marketplace" className="pl-8" />
          </div>

          <div className="w-[160px] space-y-1">
            <Label className="text-xs text-muted-foreground">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger aria-label="Filter by category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {LISTING_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[180px] space-y-1">
            <Label className="text-xs text-muted-foreground">Sort by</Label>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger aria-label="Sort listings">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {SORT_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-[130px] space-y-1">
            <Label htmlFor="max-price" className="text-xs text-muted-foreground">
              Max price ($)
            </Label>
            <Input
              id="max-price"
              inputMode="decimal"
              value={maxPrice}
              disabled={freeOnly}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Any"
            />
          </div>

          <div className="flex items-center gap-2 pb-2">
            <Switch id="free-only" checked={freeOnly} onCheckedChange={setFreeOnly} />
            <Label htmlFor="free-only" className="text-sm">
              Free only
            </Label>
          </div>
        </div>


        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Store}
            title="Nothing on sale yet."
            description="Be the first to publish one of your bots to the Bottly marketplace."
            actionLabel="Publish a bot"
            onAction={() => void navigate({ to: user ? "/marketplace/publish" : "/login" })}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((l) => (
              <Link
                key={l.id}
                to="/marketplace/$listingId"
                params={{ listingId: l.id }}
                className="panel flex flex-col overflow-hidden transition hover:border-primary/60"
              >
                <div className="aspect-video w-full overflow-hidden bg-elevated">
                  {l.images[0] ? (
                    <img src={l.images[0]} alt={`${l.title} cover`} loading="lazy" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <Store className="size-8" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start gap-2">
                    <h2 className="mr-auto font-semibold">{l.title}</h2>
                    <Badge variant={l.price === 0 ? "secondary" : "default"}>{l.price === 0 ? "Free" : usd(l.price)}</Badge>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <StarRating value={l.rating} count={l.reviewCount} />
                    <span className="ml-auto text-xs capitalize text-muted-foreground">{l.category}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{l.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {l.tags.slice(0, 4).map((t) => (
                      <span key={t} className="rounded-md bg-elevated px-2 py-0.5 text-[11px] text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    {l.seller?.displayName ?? "Bottly creator"}
                    <BadgeIcons badges={l.seller?.badges ?? []} />
                    <span className="ml-auto">{l.salesCount} purchases</span>
                  </p>
                </div>

              </Link>
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
