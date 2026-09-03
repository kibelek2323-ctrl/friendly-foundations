/**
 * Control-plane server functions for starting/stopping bots.
 *
 * Browser → these server functions (Supabase JWT + CSRF) → runtime service.
 * The browser never talks to the runtime and never sees a bot token.
 *
 * Server-only modules are imported dynamically inside the handlers: this file
 * also ships to the client bundle as a call shim.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { BotRuntimeStatus, RuntimeCommandResult, RuntimeEventRecord } from "@/types/runtime";

const botIdInput = z.object({ botId: z.string().min(1).max(64) });

const eventsInput = z.object({
  botId: z.string().min(1).max(64),
  limit: z.number().int().min(1).max(200).optional(),
});

interface AuthedContext {
  supabase: SupabaseClient<Database>;
  userId: string;
}

/**
 * Ownership check on the RLS-scoped client: a bot the caller cannot select is
 * not theirs, so it is treated as non-existent.
 */
async function ownsBot(context: AuthedContext, botId: string): Promise<boolean> {
  const { data } = await context.supabase
    .from("bots")
    .select("id")
    .eq("user_id", context.userId)
    .eq("id", botId)
    .maybeSingle();

  return Boolean(data);
}

export const getBotRuntimeStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => botIdInput.parse(data))
  .handler(async ({ data, context }): Promise<BotRuntimeStatus> => {
    const store = await import("@/lib/bot-runtime-store.server");

    // Deliberately not an error: never confirm whether someone else's bot exists.
    if (!(await ownsBot(context, data.botId))) return store.offlineStatus(data.botId);

    const persisted = await store.readRuntimeState(context.userId, data.botId);
    const runtime = await import("@/lib/runtime-client.server");

    try {
      const live = await runtime.runtimeStatus(data.botId, context.userId);
      const status = runtime.toStatus(data.botId, live, new Date().toISOString());

      if (
        !persisted ||
        persisted.state !== status.state ||
        persisted.username !== status.username ||
        persisted.guildCount !== status.guildCount
      ) {
        await store.writeRuntimeState({
          bot_id: data.botId,
          user_id: context.userId,
          state: status.state,
          started_at: status.startedAt,
          last_error: status.lastError,
          guild_count: status.guildCount,
          username: status.username,
        });
      }

      return status;
    } catch (error) {
      if (!runtime.isRuntimeError(error)) throw error;
      // An unreachable or unconfigured runtime is not a dashboard failure:
      // report the last state we were told about.
      console.warn(`[bot-runtime] status probe failed (${error.code}): ${error.message}`);
      return persisted ?? store.offlineStatus(data.botId);
    }
  });

export const startBotRuntime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => botIdInput.parse(data))
  .handler(async ({ data, context }): Promise<RuntimeCommandResult> => {
    if (!(await ownsBot(context, data.botId))) {
      return { ok: false, error: "That bot no longer exists." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tokenRow } = await supabaseAdmin
      .from("bot_tokens")
      .select("bot_id")
      .eq("user_id", context.userId)
      .eq("bot_id", data.botId)
      .maybeSingle();

    if (!tokenRow) {
      return {
        ok: false,
        error: "Add a verified bot token in Settings before starting this bot.",
      };
    }

    const store = await import("@/lib/bot-runtime-store.server");
    const runtime = await import("@/lib/runtime-client.server");
    const now = new Date().toISOString();

    try {
      const live = await runtime.runtimeStart(data.botId, context.userId);
      const status = runtime.toStatus(data.botId, live, now);

      await store.writeRuntimeState({
        bot_id: data.botId,
        user_id: context.userId,
        state: status.state,
        started_at: status.startedAt,
        last_error: status.lastError,
        guild_count: status.guildCount,
        username: status.username,
      });

      await store.appendRuntimeEvents(context.userId, data.botId, [
        {
          event: "runtime.start",
          level: status.state === "error" ? "error" : "info",
          description:
            status.state === "online"
              ? "Runtime connected the bot to the Discord gateway."
              : `Runtime accepted the start command (state: ${status.state}).`,
          at: now,
        },
      ]);

      return { ok: true, status };
    } catch (error) {
      console.error("[bot-runtime] start failed", error);
      const message = runtime.describeRuntimeFailure(error, "Could not start the bot. Try again.");

      await store.writeRuntimeState({
        bot_id: data.botId,
        user_id: context.userId,
        state: "error",
        started_at: null,
        last_error: message,
      });
      await store.appendRuntimeEvents(context.userId, data.botId, [
        { event: "runtime.error", level: "error", description: message, at: now },
      ]);

      return {
        ok: false,
        error: message,
        status: {
          botId: data.botId,
          state: "error",
          startedAt: null,
          updatedAt: now,
          lastError: message,
          guildCount: null,
          username: null,
        },
      };
    }
  });

export const stopBotRuntime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => botIdInput.parse(data))
  .handler(async ({ data, context }): Promise<RuntimeCommandResult> => {
    if (!(await ownsBot(context, data.botId))) {
      return { ok: false, error: "That bot no longer exists." };
    }

    const store = await import("@/lib/bot-runtime-store.server");
    const runtime = await import("@/lib/runtime-client.server");
    const now = new Date().toISOString();

    try {
      // No token check here on purpose: a bot must remain stoppable even after
      // its token has been removed.
      const live = await runtime.runtimeStop(data.botId, context.userId);
      const status = runtime.toStatus(data.botId, live, now);

      await store.writeRuntimeState({
        bot_id: data.botId,
        user_id: context.userId,
        state: status.state,
        started_at: status.startedAt,
        last_error: status.lastError,
        guild_count: status.guildCount,
        username: status.username,
      });

      await store.appendRuntimeEvents(context.userId, data.botId, [
        {
          event: "runtime.stop",
          level: "warning",
          description:
            status.state === "offline"
              ? "Runtime disconnected the bot from the Discord gateway."
              : `Runtime accepted the stop command (state: ${status.state}).`,
          at: now,
        },
      ]);

      return { ok: true, status };
    } catch (error) {
      console.error("[bot-runtime] stop failed", error);
      const message = runtime.describeRuntimeFailure(error, "Could not stop the bot. Try again.");

      await store.appendRuntimeEvents(context.userId, data.botId, [
        { event: "runtime.error", level: "error", description: message, at: now },
      ]);

      const persisted = await store.readRuntimeState(context.userId, data.botId);
      return { ok: false, error: message, status: persisted ?? undefined };
    }
  });

export const getBotRuntimeEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => eventsInput.parse(data))
  .handler(async ({ data, context }): Promise<RuntimeEventRecord[]> => {
    if (!(await ownsBot(context, data.botId))) return [];

    const store = await import("@/lib/bot-runtime-store.server");
    return store.listRuntimeEvents(context.userId, data.botId, data.limit ?? 100);
  });