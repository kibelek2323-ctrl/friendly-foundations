import { useState } from "react";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Coins, Loader2, ShoppingCart, Store } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { DiscordMarkdown } from "@/components/discord/DiscordMarkdown";
import { buyListing, getListing, getMyBalance } from "@/lib/marketplace.functions";
import { useAuthStore } from "@/stores/useAuthStore";
import { pullWorkspace } from "@/lib/cloud-sync";

export const Route = createFileRoute("/_authenticated/marketplace/$listingId")({
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

function Page() {
  const { listingId } = useParams({ from: "/_authenticated/marketplace/$listingId" });
  const fetchListing = useServerFn(getListing);
  const fetchBalance = useServerFn(getMyBalance);
  const buy = useServerFn(buyListing);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", listingId],
    queryFn: () => fetchListing({ data: { id: listingId } }),
  });
  const { data: balance, refetch: refetchBalance } = useQuery({ queryKey: ["my-balance"], queryFn: () => fetchBalance() });

  const owned = balance?.purchasedListingIds.includes(listingId) ?? false;
  const isSeller = !!user && listing?.sellerId === user.id;
  const affordable = (balance?.balance ?? 0) >= (listing?.price ?? 0);

  const purchase = async () => {
    setBusy(true);
    try {
      const res = await buy({ data: { listingId } });
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

  return (
    <AppShell title="Marketplace">
      <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
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
          <>
            <header className="panel space-y-4 p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="mr-auto min-w-0">
                  <h1 className="text-xl font-semibold">{listing.title}</h1>
                  <p className="text-sm text-muted-foreground">{listing.summary}</p>
                </div>
                <Badge variant={listing.price === 0 ? "secondary" : "default"} className="gap-1">
                  <Coins className="size-3.5" aria-hidden="true" />
                  {listing.price === 0 ? "Free" : `${listing.price} credits`}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>{listing.commandCount} commands</span>
                <span>{listing.componentCount} components</span>
                <span>{listing.automationCount} automations</span>
                <span>{listing.salesCount} purchases</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {owned ? (
                  <Button disabled variant="outline">
                    Already in your workspace
                  </Button>
                ) : isSeller ? (
                  <Button disabled variant="outline">
                    This is your listing
                  </Button>
                ) : (
                  <Button className="gap-1.5" disabled={!affordable} onClick={() => setConfirm(true)}>
                    <ShoppingCart className="size-4" aria-hidden="true" />
                    {listing.price === 0 ? "Get for free" : `Buy for ${listing.price} credits`}
                  </Button>
                )}
                <span className="text-xs text-muted-foreground">Your balance: {balance?.balance ?? 0} credits</span>
                {!affordable && !owned && !isSeller && (
                  <Link to="/billing" className="text-xs text-primary hover:underline">
                    Top up with a code
                  </Link>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                After buying, the bot lands in My Bots. You can change its name, avatar, colors and presence — the commands and
                flow logic stay as the author built them.
              </p>
            </header>

            {listing.images.length > 0 && (
              <section className="grid gap-3 sm:grid-cols-2">
                {listing.images.map((src, i) => (
                  <img
                    key={src}
                    src={src}
                    alt={`${listing.title} screenshot ${i + 1}`}
                    loading="lazy"
                    className="w-full rounded-lg border border-border object-cover"
                  />
                ))}
              </section>
            )}

            <section className="panel p-5">
              <h2 className="mb-3 text-sm font-semibold">About this bot</h2>
              <DiscordMarkdown text={listing.description || "_No description provided._"} className="text-sm leading-relaxed" />
            </section>
          </>
        )}

        <AlertDialog open={confirm} onOpenChange={setConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Buy {listing?.title}?</AlertDialogTitle>
              <AlertDialogDescription>
                {listing?.price ?? 0} credits will be deducted from your balance and a copy of this bot will be added to your
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
    </AppShell>
  );
}
