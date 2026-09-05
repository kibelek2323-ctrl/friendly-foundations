import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { pairNode } from "@/lib/hosting/hosting-manager.server";

const pairSchema = z.object({
  code: z.string().trim().min(8).max(64),
  hostname: z.string().max(255).optional(),
  platform: z.string().max(255).optional(),
  dockerVersion: z.string().max(255).optional(),
});

export const Route = createFileRoute("/api/public/hosting/pair")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
        }
        const parsed = pairSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
        }
        const result = await pairNode(parsed.data.code, {
          hostname: parsed.data.hostname,
          platform: parsed.data.platform,
          dockerVersion: parsed.data.dockerVersion,
        });
        if (!result.ok) {
          return Response.json({ ok: false, error: result.error }, { status: 400 });
        }
        return Response.json({ ok: true, nodeId: result.nodeId, name: result.name, token: result.token });
      },
    },
  },
});
