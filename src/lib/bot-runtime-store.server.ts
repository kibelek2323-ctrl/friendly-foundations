/**
 * Persistence for runtime state and runtime activity.
 *
 * Both tables are service_role-writable only (owners get SELECT through RLS),
 * so every write in here goes through the admin client.
 */
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { BotRuntimeStatus, RuntimeEvent, RuntimeEventRecord } from "@/types/runtime";
import type {
  BotRuntimeEventInsert,
  BotRuntimeStateInsert,
  BotRuntimeStateRow,
  RuntimeClient,
} from "@/types/runtime-db";

const MAX_EVENTS_PER_CALL = 50;
const MAX_EVENT_NAME = 120;
const MAX_DESCRIPTION = 2000;

/**
 * The generated Database type does not include the runtime tables yet, so the
 * admin client is viewed through the hand-written RuntimeClient facade (see
 * src/types/runtime-db.ts) instead of editing the generated file.
 */
function db(): RuntimeClient {
  return supabaseAdmin as unknown as RuntimeClient;
}

function isoOrNow(value: string | null | undefined): string {
  if (!value) return new Date().toISOString();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
}

export function offlineStatus(botId: string): BotRuntimeStatus {
  return {
    botId,
    state: "offline",
    startedAt: null,
    updatedAt: null,
    lastError: null,
    guildCount: null,
    username: null,
  };
}

export function rowToStatus(row: BotRuntimeStateRow): BotRuntimeStatus {
  return {
    botId: row.bot_id,
    state: row.state,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    lastError: row.last_error,
    guildCount: row.guild_count,
    username: row.username,
  };
}

export async function readRuntimeState(
  userId: string,
  botId: string,
): Promise<BotRuntimeStatus | null> {
  const { data, error } = await db()
    .from("bot_runtime_state")
    .select("*")
    .eq("user_id", userId)
    .eq("bot_id", botId)
    .maybeSingle();

  if (error) {
    console.error("[bot-runtime] state read failed", error);
    return null;
  }
  return data ? rowToStatus(data) : null;
}

export async function writeRuntimeState(input: BotRuntimeStateInsert): Promise<boolean> {
  const { error } = await db()
    .from("bot_runtime_state")
    .upsert(input, { onConflict: "user_id,bot_id" });

  if (error) {
    console.error("[bot-runtime] state write failed", error);
    return false;
  }
  return true;
}

export async function appendRuntimeEvents(
  userId: string,
  botId: string,
  events: readonly RuntimeEvent[],
): Promise<boolean> {
  if (events.length === 0) return true;

  const rows: BotRuntimeEventInsert[] = events.slice(0, MAX_EVENTS_PER_CALL).map((entry) => ({
    user_id: userId,
    bot_id: botId,
    level: entry.level,
    event: entry.event.slice(0, MAX_EVENT_NAME),
    description: entry.description.slice(0, MAX_DESCRIPTION),
    created_at: isoOrNow(entry.at),
  }));

  const { error } = await db().from("bot_runtime_events").insert(rows);
  if (error) {
    console.error("[bot-runtime] event insert failed", error);
    return false;
  }
  return true;
}

export async function listRuntimeEvents(
  userId: string,
  botId: string,
  limit: number,
): Promise<RuntimeEventRecord[]> {
  const capped = Math.min(Math.max(Math.trunc(limit), 1), 200);

  const { data, error } = await db()
    .from("bot_runtime_events")
    .select("id, level, event, description, created_at")
    .eq("user_id", userId)
    .eq("bot_id", botId)
    .order("created_at", { ascending: false })
    .limit(capped);

  if (error) {
    console.error("[bot-runtime] event read failed", error);
    return [];
  }
  if (!data) return [];

  return data.map((row) => ({
    // Prefixed so these ids can never collide with locally generated log ids.
    id: `runtime-${row.id}`,
    event: row.event,
    level: row.level,
    description: row.description,
    timestamp: row.created_at,
  }));
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const callbackSchema = z.object({
  botId: z.string().min(1).max(64),
  userId: z.string().regex(UUID_PATTERN, "userId must be a UUID"),
  state: z.enum(["offline", "starting", "online", "stopping", "error"]),
  startedAt: z.string().max(40).nullish(),
  lastError: z.string().max(MAX_DESCRIPTION).nullish(),
  guildCount: z.number().int().nonnegative().max(1_000_000).nullish(),
  username: z.string().max(120).nullish(),
  events: z
    .array(
      z.object({
        event: z.string().min(1).max(MAX_EVENT_NAME),
        level: z.enum(["info", "success", "warning", "error"]),
        description: z.string().max(MAX_DESCRIPTION).default(""),
        at: z.string().max(40).default(""),
      }),
    )
    .max(MAX_EVENTS_PER_CALL)
    .optional(),
});

export type RuntimeCallbackPayload = z.infer<typeof callbackSchema>;

/** Validates a runtime → control-plane report. Returns null when malformed. */
export function parseRuntimeCallback(value: unknown): RuntimeCallbackPayload | null {
  const parsed = callbackSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}