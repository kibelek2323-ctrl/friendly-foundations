import { createFileRoute } from "@tanstack/react-router";

/**
 * Internal endpoint: the runtime pushes gateway state changes and activity here.
 *
 * This is what makes the dashboard truthful without polling Discord: the runtime
 * is the source of truth and reports every transition (including crashes and
 * reconnects) as soon as it happens.
 *
 * SECURITY: authenticated only by BOT_RUNTIME_CALLBACK_SECRET.
 */
export const Route = createFileRoute("/api/internal/runtime/events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { checkInternalRequest } = await import("@/lib/internal-api-auth.server");
        const rejection = checkInternalRequest(request);
        if (rejection) return rejection;

        const store = await import("@/lib/bot-runtime-store.server");
        const payload = store.parseRuntimeCallback(await request.json().catch(() => null));

        if (!payload) {
          return Response.json(
            { ok: false, error: "Invalid runtime payload." },
            { status: 400, headers: { "cache-control": "no-store" } },
          );
        }

        const wrote = await store.writeRuntimeState({
          bot_id: payload.botId,
          user_id: payload.userId,
          state: payload.state,
          started_at: payload.startedAt ?? null,
          last_error: payload.lastError ?? null,
          guild_count: payload.guildCount ?? null,
          username: payload.username ?? null,
        });

        if (!wrote) {
          return Response.json(
            { ok: false, error: "Could not persist runtime state." },
            { status: 500, headers: { "cache-control": "no-store" } },
          );
        }

        if (payload.events && payload.events.length > 0) {
          await store.appendRuntimeEvents(payload.userId, payload.botId, payload.events);
        }

        return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});