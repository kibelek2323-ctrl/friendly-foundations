import { createFileRoute } from "@tanstack/react-router";

/** Temporary diagnostics: reports which backend host the server runtime is bound to. */
export const Route = createFileRoute("/api/public/diag")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env["SUPABASE_URL"] ?? "";
        const host = url ? new URL(url).host : null;
        return Response.json({
          serverSupabaseHost: host,
          hasPublishableKey: Boolean(process.env["SUPABASE_PUBLISHABLE_KEY"]),
          hasServiceRoleKey: Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]),
        });
      },
    },
  },
});
