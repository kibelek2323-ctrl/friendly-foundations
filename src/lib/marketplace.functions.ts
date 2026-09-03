import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ListingSummary {
  id: string;
  title: string;
  summary: string;
  images: string[];
  tags: string[];
  price: number;
  salesCount: number;
  sellerId: string;
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
    salesCount: row.sales_count,
    sellerId: row.seller_id,
    createdAt: row.created_at,
  };
}

const LIST_COLUMNS = "id, seller_id, title, summary, images, tags, price, sales_count, created_at, published";

/** Public catalogue of published bots. */
export const listMarketplace = createServerFn({ method: "GET" }).handler(async (): Promise<ListingSummary[]> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("marketplace_listings")
    .select(LIST_COLUMNS)
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(120);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toSummary(r as ListingRow));
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
    return {
      ...toSummary(r),
      description: r.description ?? "",
      published: r.published ?? false,
      commandCount: bot.commands?.length ?? 0,
      componentCount: bot.components?.length ?? 0,
      automationCount: bot.automations?.length ?? 0,
    };
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
    return (data ?? []).map((r) => ({
      ...toSummary(r as ListingRow),
      published: (r as ListingRow).published ?? false,
    }));
  });

const publishInput = z.object({
  botId: z.string().min(1),
  title: z.string().min(3).max(80),
  summary: z.string().max(160).default(""),
  description: z.string().max(8000).default(""),
  images: z.array(z.string().url()).max(6).default([]),
  tags: z.array(z.string().min(1).max(24)).max(6).default([]),
  price: z.number().int().min(0).max(1000000),
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
  .inputValidator((data: unknown) => z.object({ listingId: z.string().uuid() }).parse(data))
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

    const { data: result, error } = await supabaseAdmin.rpc("purchase_listing", {
      _user_id: context.userId,
      _listing_id: listing.id,
      _bot_id: newBotId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _bot_data: botCopy as any,
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
