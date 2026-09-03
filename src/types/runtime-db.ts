/**
 * Types for the tables added by
 * supabase/migrations/20260828140000_bot_runtime_control.sql.
 *
 * src/integrations/supabase/types.ts is GENERATED and does not know about
 * bot_runtime_state / bot_runtime_events yet. Two approaches were tried:
 *
 *   1. A standalone `Database` type — postgrest-js collapsed every table to
 *      `never` because the shape did not match what it expects.
 *   2. Merging the new tables into the generated `Database` via an
 *      intersection — same result: `SupabaseClient<Merged>` still resolved
 *      inserts to `never[]`, because postgrest-js cannot derive its schema
 *      helpers through an intersected schema.
 *
 * So instead of fighting the generic inference, this file declares a small
 * HAND-WRITTEN facade covering exactly the four operations the runtime store
 * performs. Call sites stay fully typed (Row / Insert are real types), and no
 * `any` is introduced.
 *
 * WHEN types.ts IS REGENERATED: delete this file and replace its imports with
 * `Tables<"bot_runtime_state">` / `TablesInsert<"bot_runtime_events">`, and use
 * `supabaseAdmin` directly.
 */
import type { PostgrestError } from "@supabase/supabase-js";
import type { RuntimeEventLevel, RuntimeState } from "@/types/runtime";

export interface BotRuntimeStateRow {
  bot_id: string;
  user_id: string;
  state: RuntimeState;
  started_at: string | null;
  last_error: string | null;
  guild_count: number | null;
  username: string | null;
  created_at: string;
  updated_at: string;
}

export interface BotRuntimeStateInsert {
  bot_id: string;
  user_id: string;
  state: RuntimeState;
  started_at?: string | null;
  last_error?: string | null;
  guild_count?: number | null;
  username?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BotRuntimeEventRow {
  id: number;
  bot_id: string;
  user_id: string;
  level: RuntimeEventLevel;
  event: string;
  description: string;
  created_at: string;
}

export interface BotRuntimeEventInsert {
  bot_id: string;
  user_id: string;
  level?: RuntimeEventLevel;
  event: string;
  description?: string;
  created_at?: string;
}

/** Result shape returned by every awaited PostgREST builder. */
export interface RuntimeResult<T> {
  data: T;
  error: PostgrestError | null;
}

/**
 * Subset of the PostgREST select builder used by the runtime store.
 * Chainable and awaitable, exactly like the real client.
 */
export interface RuntimeSelectBuilder<Row>
  extends PromiseLike<RuntimeResult<Row[] | null>> {
  eq(column: string, value: string | number): RuntimeSelectBuilder<Row>;
  order(column: string, options: { ascending: boolean }): RuntimeSelectBuilder<Row>;
  limit(count: number): RuntimeSelectBuilder<Row>;
  maybeSingle(): PromiseLike<RuntimeResult<Row | null>>;
}

export interface RuntimeTableClient<Row, Insert> {
  select(columns: string): RuntimeSelectBuilder<Row>;
  insert(rows: readonly Insert[]): PromiseLike<RuntimeResult<null>>;
  upsert(
    row: Insert,
    options?: { onConflict: string },
  ): PromiseLike<RuntimeResult<null>>;
}

/** Minimal typed view of the admin client over the two runtime tables. */
export interface RuntimeClient {
  from(table: "bot_runtime_state"): RuntimeTableClient<
    BotRuntimeStateRow,
    BotRuntimeStateInsert
  >;
  from(table: "bot_runtime_events"): RuntimeTableClient<
    BotRuntimeEventRow,
    BotRuntimeEventInsert
  >;
}