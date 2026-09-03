import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const LISTING_CATEGORIES = [
  "moderation",
  "utility",
  "fun",
  "economy",
  "music",
  "tickets",
  "leveling",
  "other",
] as const;
export type ListingCategory = (typeof LISTING_CATEGORIES)[number];

export interface ListingSeller {
  id: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  verified: boolean;
}

export interface ListingSummary {
  id: string;
  title: string;
  summary: string;
  images: string[];
  tags: string[];
  price: number;
  category: string;
  salesCount: number;
  sellerId: string;
  seller: ListingSeller | null;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

export interface ListingDetail extends ListingSummary {
  description: string;
  published: boolean;
  commandCount: number;
  componentCount: number;
  automationCount: number;
}

interface ListingRow {
  id: string;
  seller_id: string;
  title: string;
  summary: string;
  description?: string;
  images: string[];
  tags: string[];
  price: number;
  category?: string;
  sales_count: number;
  created_at: string;
  published?: boolean;
  bot_data?: unknown;
}

function toSummary(row: ListingRow): ListingSummary {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    images: row.images ?? [],
    tags: row.tags ?? [],
    price: row.price,
    category: row.category ?? "other",
    salesCount: row.sales_count,
    sellerId: row.seller_id,
    seller: null,
    rating: 0,
    reviewCount: 0,
    createdAt: row.created_at,
  };
}

function isStoredImagePath(value: string): boolean {
  return !value.startsWith("http://") && !value.startsWith("https://");
}

async function signListingImages<T extends ListingSummary>(items: T[]): Promise<T[]> {
  const paths = Array.from(new Set(items.flatMap((item) => item.images).filter(isStoredImagePath)));
  if (paths.length === 0) return items;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from("marketplace-images").createSignedUrls(paths, 60 * 60);
  if (error) throw new Error(`Could not load marketplace images: ${error.message}`);
  const signed = new Map((data ?? []).map((entry, index) => [paths[index], entry.signedUrl]));
  return items.map((item) => ({
    ...item,
    images: item.images.map((image) => signed.get(image) ?? image),
  }));
}

/** Attaches public seller profiles and review aggregates to listings. */
async function decorateListings<T extends ListingSummary>(items: T[]): Promise<T[]> {
  if (items.length === 0) return items;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sellerIds = Array.from(new Set(items.map((i) => i.sellerId)));
  const listingIds = items.map((i) => i.id);

  const [{ data: profiles }, { data: reviews }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, display_name, username, avatar_url, verified").in("id", sellerIds),
    supabaseAdmin.from("listing_reviews").select("listing_id, rating").in("listing_id", listingIds),
  ]);

  const sellerMap = new Map<string, ListingSeller>(
    (profiles ?? []).map((p) => [
      p.id,
      {
        id: p.id,
        displayName: p.display_name ?? "Bottly creator",
        username: p.username ?? null,
        avatarUrl: p.avatar_url ?? null,
        verified: p.verified ?? false,
      },
    ]),
  );

  const agg = new Map<string, { total: number; count: number }>();
  for (const r of reviews ?? []) {
    const entry = agg.get(r.listing_id) ?? { total: 0, count: 0 };
    entry.total += r.rating;
    entry.count += 1;
    agg.set(r.listing_id, entry);
  }

  return items.map((item) => {
    const a = agg.get(item.id);
    return {
      ...item,
      seller: sellerMap.get(item.sellerId) ?? null,
      rating: a && a.count > 0 ? Math.round((a.total / a.count) * 10) / 10 : 0,
      reviewCount: a?.count ?? 0,
    };
  });
}

const LIST_COLUMNS =
  "id, seller_id, title, summary, images, tags, price, category, sales_count, created_at, published";

const listFilters = z.object({
  category: z.string().max(32).nullable().default(null),
  sort: z.enum(["newest", "rating", "bestsellers", "price-asc", "price-desc"]).default("newest"),
  freeOnly: z.boolean().default(false),
  maxPrice: z.number().int().min(0).nullable().default(null),
  sellerId: z.string().uuid().nullable().default(null),
});

/** Public catalogue of published bots, with filtering and sorting. */
export const listMarketplace = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => listFilters.parse(data ?? {}))
  .handler(async ({ data }): Promise<ListingSummary[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin.from("marketplace_listings").select(LIST_COLUMNS).eq("published", true);
    if (data.category) query = query.eq("category", data.category);
    if (data.sellerId) query = query.eq("seller_id", data.sellerId);
    if (data.freeOnly) query = query.eq("price", 0);
    else if (data.maxPrice !== null) query = query.lte("price", data.maxPrice);

    if (data.sort === "bestsellers") query = query.order("sales_count", { ascending: false });
    else if (data.sort === "price-asc") query = query.order("price", { ascending: true });
    else if (data.sort === "price-desc") query = query.order("price", { ascending: false });
    else query = query.order("created_at", { ascending: false });

    const { data: rows, error } = await query.limit(120);
    if (error) throw new Error(error.message);
    const decorated = await decorateListings((rows ?? []).map((r) => toSummary(r as ListingRow)));
    if (data.sort === "rating") {
      decorated.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
    }
    return signListingImages(decorated);
  });


export const getListing = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<ListingDetail | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("marketplace_listings")
      .select(`${LIST_COLUMNS}, description, bot_data`)
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return null;
    const r = row as ListingRow;
    const bot = (r.bot_data ?? {}) as {
      commands?: unknown[];
      components?: unknown[];
      automations?: unknown[];
    };
    const detail = {
      ...toSummary(r),
      description: r.description ?? "",
      published: r.published ?? false,
      commandCount: bot.commands?.length ?? 0,
      componentCount: bot.components?.length ?? 0,
      automationCount: bot.automations?.length ?? 0,
    };
    const [decorated] = await decorateListings([detail]);
    const [signed] = await signListingImages([decorated ?? detail]);
    return signed ?? detail;

  });

export const myListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<(ListingSummary & { published: boolean })[]> => {
    const { data, error } = await context.supabase
      .from("marketplace_listings")
      .select(LIST_COLUMNS)
      .eq("seller_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return signListingImages((data ?? []).map((r) => ({
      ...toSummary(r as ListingRow),
      published: (r as ListingRow).published ?? false,
    })));
  });

export const uploadMarketplaceImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    if (!(data instanceof FormData)) throw new Error("Invalid upload.");
    return data;
  })
  .handler(async ({ data, context }): Promise<{ path: string; signedUrl: string }> => {
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("Choose an image to upload.");
    if (file.size > 5_000_000) throw new Error("The image is larger than 5 MB.");
    if (!/^image\/(png|jpe?g|webp|gif|avif)$/.test(file.type)) throw new Error("Unsupported image format.");

    const ext = (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${context.userId}/${crypto.randomUUID()}.${ext}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from("marketplace-images").upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw new Error(`Storage upload failed: ${error.message}`);
    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from("marketplace-images")
      .createSignedUrl(path, 60 * 60);
    if (signedError || !signed?.signedUrl) throw new Error(signedError?.message ?? "Could not preview the image.");
    return { path, signedUrl: signed.signedUrl };
  });

const publishInput = z.object({
  botId: z.string().min(1),
  title: z.string().min(3).max(80),
  summary: z.string().max(160).default(""),
  description: z.string().max(8000).default(""),
  images: z.array(z.string().min(1).max(500)).max(6).default([]),
  tags: z.array(z.string().min(1).max(24)).max(6).default([]),
  price: z.number().int().min(0).max(1000000),
  category: z.enum(LISTING_CATEGORIES).default("other"),
  botData: z.record(z.string(), z.unknown()),
  flowData: z.record(z.string(), z.unknown()).nullable().default(null),
});

export const publishListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => publishInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; id?: string; error?: string }> => {
    const { error, data: row } = await context.supabase
      .from("marketplace_listings")
      .insert({
        seller_id: context.userId,
        source_bot_id: data.botId,
        title: data.title,
        summary: data.summary,
        description: data.description,
        images: data.images,
        tags: data.tags,
        price: data.price,
        category: data.category,

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bot_data: data.botData as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        flow_data: (data.flowData ?? null) as any,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: "Could not publish this bot." };
    return { ok: true, id: row.id };
  });

export const setListingPublished = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), published: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("marketplace_listings")
      .update({ published: data.published })
      .eq("id", data.id)
      .eq("seller_id", context.userId);
    return { ok: true };
  });

export const deleteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await context.supabase.from("marketplace_listings").delete().eq("id", data.id).eq("seller_id", context.userId);
    return { ok: true };
  });

export interface MyBalance {
  balance: number;
  purchasedListingIds: string[];
}

export const getMyBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyBalance> => {
    const [{ data: row }, { data: purchases }] = await Promise.all([
      context.supabase.from("user_balances").select("balance").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("marketplace_purchases").select("listing_id").eq("buyer_id", context.userId),
    ]);
    return {
      balance: row?.balance ?? 0,
      purchasedListingIds: (purchases ?? []).map((p) => p.listing_id),
    };
  });

export const redeemBalanceCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ code: z.string().min(3).max(64) }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string; amount?: number; balance?: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("redeem_balance_code", {
      _user_id: context.userId,
      _code: data.code,
    });
    if (error) return { ok: false, error: "Could not redeem that code." };
    return (result as { ok: boolean; error?: string; amount?: number; balance?: number }) ?? { ok: false, error: "Invalid code." };
  });

/**
 * Buys a listing with account balance and copies the bot (plus its flow) into
 * the buyer's workspace. Purchased bots are appearance-only editable.
 */
export const buyListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({ listingId: z.string().uuid(), discountCode: z.string().max(64).nullable().default(null) })
      .parse(data),
  )

  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string; botId?: string; balance?: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: listing } = await supabaseAdmin
      .from("marketplace_listings")
      .select("id, title, bot_data, flow_data, published")
      .eq("id", data.listingId)
      .maybeSingle();
    if (!listing || !listing.published) return { ok: false, error: "Listing not available." };

    const now = new Date().toISOString();
    const newBotId = `bot_${crypto.randomUUID().slice(0, 12)}`;
    const source = (listing.bot_data ?? {}) as Record<string, unknown>;
    const flow = listing.flow_data as Record<string, unknown> | null;

    let newFlowId: string | null = null;
    if (flow && typeof flow === "object") {
      newFlowId = `flow_${crypto.randomUUID().slice(0, 12)}`;
      const flowCopy = { ...flow, id: newFlowId, updatedAt: now, createdAt: now };
      await supabaseAdmin.from("flows").insert({
        id: newFlowId,
        user_id: context.userId,
        name: String(flow['name'] ?? listing.title),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: flowCopy as any,
      });
    }

    const botCopy = {
      ...source,
      id: newBotId,
      status: "offline",
      flowId: newFlowId,
      purchased: true,
      listingId: listing.id,
      applicationId: null,
      logs: [],
      createdAt: now,
      updatedAt: now,
    };

    const { data: result, error } = await supabaseAdmin.rpc("purchase_listing_with_code", {
      _user_id: context.userId,
      _listing_id: listing.id,
      _bot_id: newBotId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _bot_data: botCopy as any,
      _code: data.discountCode,
    });
    if (error) return { ok: false, error: "Purchase failed. Please try again." };
    const parsed = (result as { ok: boolean; error?: string; balance?: number }) ?? { ok: false };
    if (!parsed.ok) return { ok: false, ...(parsed.error ? { error: parsed.error } : {}) };
    return { ok: true, botId: newBotId, ...(parsed.balance !== undefined ? { balance: parsed.balance } : {}) };

  });

export interface BalanceEntry {
  id: string;
  kind: "topup" | "purchase" | "sale";
  label: string;
  amount: number;
  createdAt: string;
}

/** Account balance plus a combined transaction history (top-ups, purchases, sales). */
export const getBalanceHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ balance: number; entries: BalanceEntry[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: bal }, { data: topups }, { data: purchases }, { data: sales }] = await Promise.all([
      supabaseAdmin.from("user_balances").select("balance").eq("user_id", context.userId).maybeSingle(),
      supabaseAdmin
        .from("balance_code_redemptions")
        .select("id, amount, created_at")
        .eq("user_id", context.userId),
      supabaseAdmin
        .from("marketplace_purchases")
        .select("id, price, created_at, marketplace_listings(title)")
        .eq("buyer_id", context.userId),
      supabaseAdmin
        .from("marketplace_purchases")
        .select("id, price, created_at, marketplace_listings!inner(title, seller_id)")
        .eq("marketplace_listings.seller_id", context.userId),
    ]);

    type Joined = { id: string; price: number; created_at: string; marketplace_listings: { title?: string } | null };
    const entries: BalanceEntry[] = [
      ...((topups ?? []) as { id: string; amount: number; created_at: string }[]).map((t) => ({
        id: `t_${t.id}`,
        kind: "topup" as const,
        label: "Balance code redeemed",
        amount: t.amount,
        createdAt: t.created_at,
      })),
      ...((purchases ?? []) as unknown as Joined[]).map((p) => ({
        id: `p_${p.id}`,
        kind: "purchase" as const,
        label: `Bought “${p.marketplace_listings?.title ?? "listing"}”`,
        amount: -p.price,
        createdAt: p.created_at,
      })),
      ...((sales ?? []) as unknown as Joined[])
        .filter((s) => s.price > 0)
        .map((s) => ({
          id: `s_${s.id}`,
          kind: "sale" as const,
          label: `Sold “${s.marketplace_listings?.title ?? "listing"}”`,
          amount: s.price,
          createdAt: s.created_at,
        })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { balance: bal?.balance ?? 0, entries };
  });
