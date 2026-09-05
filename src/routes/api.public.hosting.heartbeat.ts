import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { heartbeatNode } from "@/lib/hosting/hosting-manager.server";

const heartbeatSchema = z.object({
  event: z.enum(["heartbeat", "disconnect"]).optional(),
  hostname: z.string().max(255).optional(),
  platform: z.string().max(255).optional(),
  dockerVersion: z.string().max(255).optional(),
  cpuUsage: z.number().min(0).max(100).optional(),
  memoryUsage: z.number().min(0).optional(),
  totalMemory: z.number().min(0).optional(),
  botCount: z.number().int().min(0).optional(),
});

export const Route = createFileRoute("/api/public/hosting/heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
        if (token.length < 32) {
          return Response.json({ ok: false, error: "Missing node token." }, { status: 401 });
        }

        let body: unknown = {};
        try {
          body = await request.json();
        } catch {
          // empty body is acceptable
        }
        const parsed = heartbeatSchema.safeParse(body ?? {});
        if (!parsed.success) {
          return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
        }

        if (parsed.data.event === "disconnect") {
          // A graceful disconnect is reported as a final heartbeat; the node
          // will flip to offline once the heartbeat timeout elapses.
          return Response.json({ ok: true });
        }

        const result = await heartbeatNode(token, {
          hostname: parsed.data.hostname,
          platform: parsed.data.platform,
          dockerVersion: parsed.data.dockerVersion,
          cpuUsage: parsed.data.cpuUsage,
          memoryUsage: parsed.data.memoryUsage,
          totalMemory: parsed.data.totalMemory,
          botCount: parsed.data.botCount,
        });
        if (!result.ok) {
          return Response.json({ ok: false, error: result.error ?? "Heartbeat rejected." }, { status: 401 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
