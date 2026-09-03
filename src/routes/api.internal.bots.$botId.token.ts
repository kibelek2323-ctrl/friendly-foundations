import { createFileRoute } from "@tanstack/react-router";

/**
 * Internal endpoint: hands the runtime the ENCRYPTED token for one bot.
 *
 * The plaintext never leaves this stack — the runtime holds the same
 * BOT_TOKEN_ENCRYPTION_KEY and decrypts locally (see .env.example).
 *
 * SECURITY: authenticated only by BOT_RUNTIME_CALLBACK_SECRET. No Supabase
 * session is involved, so treat the secret as the whole perimeter.
 */
export const Route = createFileRoute("/api/internal/bots/$botId/token")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { checkInternalRequest } = await import("@/lib/internal-api-auth.server");
        const rejection = checkInternalRequest(request);
        if (rejection) return rejection;

        const userId = new URL(request.url).searchParams.get("userId");
        const uuidPattern =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!userId || !uuidPattern.test(userId)) {
          return Response.json(
            { ok: false, error: "A valid userId query parameter is required." },
            { status: 400, headers: { "cache-control": "no-store" } },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row, error } = await supabaseAdmin
          .from("bot_tokens")
          .select("ciphertext, iv, key_version, application_id")
          .eq("user_id", userId)
          .eq("bot_id", params.botId)
          .maybeSingle();

        if (error) {
          console.error("[internal-api] token lookup failed", error);
          return Response.json(
            { ok: false, error: "Token lookup failed." },
            { status: 500, headers: { "cache-control": "no-store" } },
          );
        }

        if (!row) {
          return Response.json(
            { ok: false, error: "No token stored for this bot." },
            { status: 404, headers: { "cache-control": "no-store" } },
          );
        }

        return Response.json(
          {
            ok: true,
            botId: params.botId,
            userId,
            ciphertext: row.ciphertext,
            iv: row.iv,
            keyVersion: row.key_version,
            applicationId: row.application_id,
          },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});