import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  EMPTY_SCHEMA,
  buyerVisibleSettings,
  mergeWithDefaults,
  sanitizeBuyerValues,
  validateSchema,
  type BotConfigSchema,
  type ConfigSetting,
  type ConfigValue,
  type ValidationIssue,
} from "@/lib/bot-config";

export interface BuyerConfigView {
  listingId: string;
  title: string;
  settings: Array<{ key: string } & ConfigSetting>;
  values: Record<string, ConfigValue>;
}

/** Developer rank + project ownership check shared by the schema writers. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function requireOwnedProject(context: any, projectId: string) {
  const { hasDeveloperAccess } = await import("./roles.functions");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(await hasDeveloperAccess(context as any))) throw new Error("Forbidden: Developer access is required.");
  const { data: project } = await context.supabase
    .from("code_projects")
    .select("id, storage_prefix, owner_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || project.owner_id !== context.userId) throw new Error("Forbidden: You do not own this project.");
  return project as { id: string; storage_prefix: string; owner_id: string };
}

export const getConfigSchema = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ projectId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<BotConfigSchema> => {
    await requireOwnedProject(context, data.projectId);
    const { data: row } = await context.supabase
      .from("bot_config_schemas")
      .select("schema")
      .eq("project_id", data.projectId)
      .maybeSingle();
    const parsed = validateSchema(row?.schema ?? EMPTY_SCHEMA);
    return parsed.schema ?? EMPTY_SCHEMA;
  });

export const saveConfigSchema = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ projectId: z.string().uuid(), schema: z.unknown() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; issues: ValidationIssue[] }> => {
    const project = await requireOwnedProject(context, data.projectId);
    const parsed = validateSchema(data.schema);
    if (!parsed.ok || !parsed.schema) return { ok: false, issues: parsed.issues };

    const body = JSON.stringify(parsed.schema, null, 2);
    const storage = await import("./storage/gcs.server");
    await storage.uploadFile(`${project.storage_prefix}/bottly_config.json`, body, "application/json");
    await context.supabase.from("code_project_files").upsert(
      {
        project_id: data.projectId,
        path: "bottly_config.json",
        size: body.length,
        content_type: "application/json",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,path" },
    );
    await context.supabase.from("bot_config_schemas").upsert(
      {
        project_id: data.projectId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        schema: parsed.schema as any,
      },
      { onConflict: "project_id" },
    );
    return { ok: true, issues: [] };
  });

/** Publishing gate: project exists, is owned, has required files and a valid schema. */
export const validateProjectForPublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ projectId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; issues: ValidationIssue[] }> => {
    const issues: ValidationIssue[] = [];
    let project: { storage_prefix: string } | null = null;
    try {
      project = await requireOwnedProject(context, data.projectId);
    } catch (e) {
      return { ok: false, issues: [{ key: "project", message: e instanceof Error ? e.message : "Not allowed." }] };
    }

    const { data: files } = await context.supabase
      .from("code_project_files")
      .select("path")
      .eq("project_id", data.projectId);
    const paths = new Set((files ?? []).map((f) => f.path));
    if (!paths.has("bottly_config.json")) issues.push({ key: "bottly_config.json", message: "This file is missing." });
    const hasEntry = [...paths].some((p) => /^src\/(index\.(js|ts)|main\.py)$/.test(p));
    if (!hasEntry) issues.push({ key: "src", message: "An entry file (src/index.js or src/main.py) is required." });

    const { data: row } = await context.supabase
      .from("bot_config_schemas")
      .select("schema")
      .eq("project_id", data.projectId)
      .maybeSingle();
    const parsed = validateSchema(row?.schema ?? EMPTY_SCHEMA);
    if (!parsed.ok) issues.push(...parsed.issues);

    void project;
    return { ok: issues.length === 0, issues };
  });

/** Attach the project's schema to the listing created from it. */
export const linkSchemaToListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ projectId: z.string().uuid(), listingId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    await requireOwnedProject(context, data.projectId);
    const { data: listing } = await context.supabase
      .from("marketplace_listings")
      .select("id, seller_id")
      .eq("id", data.listingId)
      .maybeSingle();
    if (!listing || listing.seller_id !== context.userId) return { ok: false };
    await context.supabase
      .from("marketplace_listings")
      .update({ source_project_id: data.projectId, kind: "code" })
      .eq("id", data.listingId);
    await context.supabase
      .from("bot_config_schemas")
      .update({ listing_id: data.listingId })
      .eq("project_id", data.projectId);
    return { ok: true };
  });

/** Buyer-facing configuration form for a purchased bot. */
export const getBuyerConfiguration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ botId: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }): Promise<BuyerConfigView | null> => {
    const { data: purchase } = await context.supabase
      .from("marketplace_purchases")
      .select("listing_id, bot_id")
      .eq("buyer_id", context.userId)
      .eq("bot_id", data.botId)
      .maybeSingle();
    if (!purchase) return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: listing } = await supabaseAdmin
      .from("marketplace_listings")
      .select("id, title, source_project_id")
      .eq("id", purchase.listing_id)
      .maybeSingle();
    if (!listing?.source_project_id) return null;

    const { data: schemaRow } = await supabaseAdmin
      .from("bot_config_schemas")
      .select("schema")
      .eq("project_id", listing.source_project_id)
      .maybeSingle();
    const parsed = validateSchema(schemaRow?.schema ?? EMPTY_SCHEMA);
    const schema = parsed.schema ?? EMPTY_SCHEMA;

    const { data: valuesRow } = await context.supabase
      .from("buyer_configurations")
      .select("values")
      .eq("listing_id", listing.id)
      .eq("buyer_id", context.userId)
      .maybeSingle();
    const stored = (valuesRow?.values ?? {}) as Record<string, ConfigValue>;

    return {
      listingId: listing.id,
      title: listing.title,
      // Internal and non-editable settings never leave the backend.
      settings: buyerVisibleSettings(schema).map(([key, setting]) => ({ key, ...setting })),
      values: mergeWithDefaults(schema, stored),
    };
  });

export const saveBuyerConfiguration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        botId: z.string().min(1),
        values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; issues: ValidationIssue[]; error?: string }> => {
    const { data: purchase } = await context.supabase
      .from("marketplace_purchases")
      .select("listing_id")
      .eq("buyer_id", context.userId)
      .eq("bot_id", data.botId)
      .maybeSingle();
    if (!purchase) return { ok: false, issues: [], error: "You do not own this bot." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: listing } = await supabaseAdmin
      .from("marketplace_listings")
      .select("id, source_project_id")
      .eq("id", purchase.listing_id)
      .maybeSingle();
    if (!listing?.source_project_id) return { ok: false, issues: [], error: "This bot has no configuration." };

    const { data: schemaRow } = await supabaseAdmin
      .from("bot_config_schemas")
      .select("schema")
      .eq("project_id", listing.source_project_id)
      .maybeSingle();
    const schema = validateSchema(schemaRow?.schema ?? EMPTY_SCHEMA).schema ?? EMPTY_SCHEMA;

    // Only editable, non-internal keys survive; everything else is dropped.
    const { values, issues } = sanitizeBuyerValues(schema, data.values);
    if (issues.length > 0) return { ok: false, issues };

    const { error } = await context.supabase.from("buyer_configurations").upsert(
      {
        listing_id: listing.id,
        project_id: listing.source_project_id,
        buyer_id: context.userId,
        bot_id: data.botId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        values: values as any,
      },
      { onConflict: "listing_id,buyer_id" },
    );
    if (error) return { ok: false, issues: [], error: "Could not save your configuration." };
    return { ok: true, issues: [] };
  });
