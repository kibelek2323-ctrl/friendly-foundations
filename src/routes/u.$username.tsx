import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Loader2, Store, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PublicShell } from "@/components/layout/PublicShell";
import { StarRating } from "@/components/marketplace/StarRating";
import { ProfileBadges } from "@/components/profile/ProfileBadges";
import { getCreatorProfile } from "@/lib/creators.functions";
import { listMarketplace } from "@/lib/marketplace.functions";
import { usd } from "@/lib/money";

export const Route = createFileRoute("/u/$username")({
  head: () => ({
    meta: [
      { title: "Creator profile — Bottly" },
      { name: "description", content: "See the Discord bots this Bottly creator publishes, their ratings and total sales." },
      { property: "og:title", content: "Creator profile — Bottly" },
      { property: "og:description", content: "See the Discord bots this Bottly creator publishes, their ratings and total sales." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { username } = useParams({ from: "/u/$username" });
  const fetchProfile = useServerFn(getCreatorProfile);
  const fetchListings = useServerFn(listMarketplace);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["creator", username],
    queryFn: () => fetchProfile({ data: { handle: username } }),
  });

  const { data: listings } = useQuery({
    queryKey: ["creator-listings", profile?.id],
    enabled: !!profile?.id,
    queryFn: () =>
      fetchListings({
        data: { category: null, sort: "bestsellers" as const, freeOnly: false, maxPrice: null, sellerId: profile!.id },
      }),
  });

  return (
    <PublicShell>
      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !profile ? (
          <div className="panel p-10 text-center">
            <UserRound className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
            <h1 className="mt-3 text-lg font-semibold">Creator not found</h1>
            <p className="mt-1 text-sm text-muted-foreground">This profile does not exist or was removed.</p>
          </div>
        ) : (
          <>
            <header className="panel flex flex-wrap items-center gap-4 p-5">
              <span className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-elevated">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  <UserRound className="size-7 text-muted-foreground" aria-hidden="true" />
                )}
              </span>
              <div className="mr-auto">
                <h1 className="flex items-center gap-1.5 text-2xl font-semibold tracking-tight">
                  {profile.displayName}
                  {profile.verified && <BadgeCheck className="size-5 text-primary" aria-label="Verified creator" />}
                </h1>
                {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
                <ProfileBadges badges={profile.badges} className="mt-2" />
                {profile.bio && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{profile.bio}</p>}
              </div>
              <dl className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <dt className="text-xs text-muted-foreground">Bots</dt>
                  <dd className="text-lg font-semibold">{profile.listingCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Sales</dt>
                  <dd className="text-lg font-semibold">{profile.salesCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Rating</dt>
                  <dd className="flex justify-center pt-1">
                    <StarRating value={profile.rating} count={profile.reviewCount} />
                  </dd>
                </div>
              </dl>
            </header>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Published bots</h2>
              {(listings ?? []).length === 0 ? (
                <p className="panel p-6 text-sm text-muted-foreground">This creator has no published bots right now.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {(listings ?? []).map((l) => (
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
                          <h3 className="mr-auto font-semibold">{l.title}</h3>
                          <Badge variant={l.price === 0 ? "secondary" : "default"}>
                            {l.price === 0 ? "Free" : usd(l.price)}
                          </Badge>
                        </div>
                        <StarRating value={l.rating} count={l.reviewCount} />
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{l.summary}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </PublicShell>
  );
}
