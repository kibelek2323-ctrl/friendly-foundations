import { useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, ChevronLeft, ChevronRight, Loader2, ShoppingCart, Store, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PublicShell } from "@/components/layout/PublicShell";
import { DiscordMarkdown } from "@/components/discord/DiscordMarkdown";
import { StarRating } from "@/components/marketplace/StarRating";
import {
  buyListing,
  getListing,
  getMyBalance,
  listReviews,
  quoteDiscount,
  upsertReview,
} from "@/lib/marketplace.functions";
import { useAuthStore } from "@/stores/useAuthStore";
import { pullWorkspace } from "@/lib/cloud-sync";
import { usd } from "@/lib/money";


export const Route = createFileRoute("/marketplace/$listingId")({
  head: () => ({
    meta: [
      { title: "Bot details — Bottly marketplace" },
      { name: "description", content: "Read the full description of a community Discord bot and add it to your Bottly workspace." },
      { property: "og:title", content: "Bot details — Bottly marketplace" },
      { property: "og:description", content: "Read the full description of a community Discord bot and add it to your Bottly workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Gallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const count = images.length;
  const current = images[Math.min(index, Math.max(0, count - 1))];

  if (count === 0) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-border bg-elevated text-muted-foreground">
        <Store className="size-10" aria-hidden="true" />
      </div>
    );
  }

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-lg border border-border bg-elevated">
        <img src={current} alt={`${title} screenshot ${index + 1}`} className="aspect-video w-full object-cover" />
        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/85 text-foreground transition hover:bg-background"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/85 text-foreground transition hover:bg-background"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-md bg-background/85 px-2 py-0.5 text-xs text-muted-foreground">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`Show image ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`size-16 overflow-hidden rounded-md border transition ${i === index ? "border-primary" : "border-border opacity-70 hover:opacity-100"}`}
            >
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Page() {
  const { listingId } = useParams({ from: "/marketplace/$listingId" });
  const fetchListing = useServerFn(getListing);
  const fetchBalance = useServerFn(getMyBalance);
  const buy = useServerFn(buyListing);
  const fetchReviews = useServerFn(listReviews);
  const saveReview = useServerFn(upsertReview);
  const checkDiscount = useServerFn(quoteDiscount);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState<{ percent: number; finalPrice: number } | null>(null);
  const [checking, setChecking] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: () => fetchListing({ data: { id: listingId } }),
  });
  const { data: balance, refetch: refetchBalance } = useQuery({
    queryKey: ["my-balance"],
    queryFn: () => fetchBalance(),
    enabled: !!user,
  });
  const { data: reviews, refetch: refetchReviews } = useQuery({
    queryKey: ["listing-reviews", listingId],
    queryFn: () => fetchReviews({ data: { listingId } }),
  });

  const owned = balance?.purchasedListingIds.includes(listingId) ?? false;
  const isSeller = !!user && listing?.sellerId === user.id;
  const payable = discount?.finalPrice ?? listing?.price ?? 0;
  const affordable = (balance?.balance ?? 0) >= payable;

  const applyCode = async () => {
    if (!code.trim()) return;
    setChecking(true);
    try {
      const res = await checkDiscount({ data: { listingId, code: code.trim() } });
      if (!res.ok || res.percent === undefined || res.finalPrice === undefined) {
        setDiscount(null);
        toast.error(res.error ?? "Invalid discount code.");
        return;
      }
      setDiscount({ percent: res.percent, finalPrice: res.finalPrice });
      toast.success(`${res.percent}% off applied.`);
    } catch {
      toast.error("Could not check that code.");
    } finally {
      setChecking(false);
    }
  };

  const purchase = async () => {
    setBusy(true);
    try {
      const res = await buy({ data: { listingId, discountCode: discount ? code.trim() : null } });
      if (!res.ok) {
        toast.error(res.error ?? "Purchase failed.");
        return;
      }
      toast.success("Bot added to your workspace!");
      if (user) await pullWorkspace(user.id);
      void refetchBalance();
      setConfirm(false);
      if (res.botId) void navigate({ to: "/bots/$botId", params: { botId: res.botId } });
    } catch {
      toast.error("Purchase failed.");
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async () => {
    if (myRating < 1) {
      toast.error("Pick a star rating first.");
      return;
    }
    setSavingReview(true);
    try {
      const res = await saveReview({ data: { listingId, rating: myRating, comment: myComment.trim() } });
      if (!res.ok) {
        toast.error(res.error ?? "Could not save your review.");
        return;
      }
      toast.success("Thanks for your review!");
      setMyComment("");
      setMyRating(0);
      void refetchReviews();
    } catch {
      toast.error("Could not save your review.");
    } finally {
      setSavingReview(false);
    }
  };


  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link to="/marketplace">
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to marketplace
          </Link>
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !listing ? (
          <div className="panel p-10 text-center">
            <Store className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
            <h1 className="mt-3 text-lg font-semibold">Listing not found</h1>
            <p className="mt-1 text-sm text-muted-foreground">It may have been unpublished by its author.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            {/* Left column: gallery, then markdown description */}
            <Gallery images={listing.images} title={listing.title} />

            {/* Right column: name, price, buy */}
            <aside className="panel h-fit space-y-4 p-5">
              <div>
                <h1 className="text-xl font-semibold">{listing.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{listing.summary}</p>
              </div>
              <p className="text-3xl font-semibold">{listing.price === 0 ? "Free" : usd(listing.price)}</p>

              {!user ? (
                <Button asChild className="w-full gap-1.5">
                  <Link to="/login">
                    <ShoppingCart className="size-4" aria-hidden="true" /> Log in to buy
                  </Link>
                </Button>
              ) : owned ? (
                <Button disabled variant="outline" className="w-full">
                  Already in your workspace
                </Button>
              ) : isSeller ? (
                <Button disabled variant="outline" className="w-full">
                  This is your listing
                </Button>
              ) : (
                <Button className="w-full gap-1.5" disabled={!affordable} onClick={() => setConfirm(true)}>
                  <ShoppingCart className="size-4" aria-hidden="true" />
                  {listing.price === 0 ? "Get for free" : `Buy for ${usd(listing.price)}`}
                </Button>
              )}

              {user && (
                <p className="text-xs text-muted-foreground">
                  Your balance: {usd(balance?.balance ?? 0)}
                  {!affordable && !owned && !isSeller && (
                    <>
                      {" · "}
                      <Link to="/balance" className="text-primary hover:underline">
                        Top up
                      </Link>
                    </>
                  )}
                </p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {listing.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>{listing.commandCount} commands</span>
                <span>{listing.componentCount} components</span>
                <span>{listing.automationCount} automations</span>
                <span>{listing.salesCount} purchases</span>
              </div>

              <p className="text-xs text-muted-foreground">
                After buying, the bot lands in My Bots. You can change its name, avatar, colors and presence — the commands and
                flow logic stay as the author built them.
              </p>
            </aside>

            {/* Description sits under the gallery; right cell stays empty */}
            <section className="panel p-5">
              <h2 className="mb-3 text-sm font-semibold">About this bot</h2>
              <DiscordMarkdown text={listing.description || "_No description provided._"} className="text-sm leading-relaxed" />
            </section>
            <div className="hidden lg:block" aria-hidden="true" />
          </div>
        )}

        <AlertDialog open={confirm} onOpenChange={setConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Buy {listing?.title}?</AlertDialogTitle>
              <AlertDialogDescription>
                {usd(listing?.price ?? 0)} will be deducted from your balance and a copy of this bot will be added to your
                workspace.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={busy}
                onClick={(e) => {
                  e.preventDefault();
                  void purchase();
                }}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Confirm purchase"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PublicShell>
  );
}
