import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  PAIRING_CODE_TTL_MS,
  createNode,
  deleteNode,
  disconnectNode,
  getNode,
  listNodes,
  regeneratePairingCode,
  setNodeDisabled,
  type HostingNode,
} from "./hosting/hosting-manager.server";

type Ctx = { supabase: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }> }; userId: string };

async function assertAdmin(context: Ctx): Promise<void> {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("Forbidden");
}

export const getHostingNodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HostingNode[]> => {
    await assertAdmin(context as unknown as Ctx);
    return listNodes();
  });

export const getHostingNode = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<HostingNode | null> => {
    await assertAdmin(context as unknown as Ctx);
    return getNode(data.id);
  });

export const createHostingNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ name: z.string().trim().min(1).max(80) }).parse(data),
  )
  .handler(
    async ({
      context,
      data,
    }): Promise<{ node: HostingNode; pairingCode: string; expiresInMinutes: number }> => {
      await assertAdmin(context as unknown as Ctx);
      const { node, pairingCode } = await createNode(data.name, context.userId);
      return { node, pairingCode, expiresInMinutes: PAIRING_CODE_TTL_MS / 60_000 };
    },
  );

export const regenerateHostingPairingCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<{ pairingCode: string; expiresInMinutes: number }> => {
    await assertAdmin(context as unknown as Ctx);
    const pairingCode = await regeneratePairingCode(data.id);
    return { pairingCode, expiresInMinutes: PAIRING_CODE_TTL_MS / 60_000 };
  });

export const setHostingNodeDisabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), disabled: z.boolean() }).parse(data),
  )
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await assertAdmin(context as unknown as Ctx);
    await setNodeDisabled(data.id, data.disabled);
    return { ok: true };
  });

export const disconnectHostingNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await assertAdmin(context as unknown as Ctx);
    await disconnectNode(data.id);
    return { ok: true };
  });

export const deleteHostingNode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<{ ok: true }> => {
    await assertAdmin(context as unknown as Ctx);
    await deleteNode(data.id);
    return { ok: true };
  });
