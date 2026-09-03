import { supabase } from "@/integrations/supabase/client";
import { stripBotSecrets } from "@/lib/sanitize-bot";
import { useBotStore } from "@/stores/useBotStore";
import { useFlowStore } from "@/stores/useFlowStore";
import type { Bot } from "@/types/bot";
import type { Flow } from "@/types/flow";
import type { Json } from "@/integrations/supabase/types";

let userId: string | null = null;
let unsubscribers: Array<() => void> = [];
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let suspended = false;

/** Pull the signed-in user's bots + flows from the cloud into the local stores. */
export async function pullWorkspace(uid: string) {
  suspended = true;
  try {
    const [{ data: botRows }, { data: flowRows }] = await Promise.all([
      supabase.from("bots").select("id, data, updated_at").eq("user_id", uid),
      supabase.from("flows").select("id, data, updated_at").eq("user_id", uid),
    ]);

    if (botRows && botRows.length > 0) {
      const bots = botRows
        .map((r) => r.data as unknown as Bot)
        .filter((b) => b && b.id)
        // Rows written by pre-v2 builds may still carry a plaintext token.
        .map(stripBotSecrets)
        .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
      useBotStore.setState({ bots });
    }

    if (flowRows && flowRows.length > 0) {
      const flows: Record<string, Flow> = {};
      for (const row of flowRows) {
        const flow = row.data as unknown as Flow;
        if (flow && flow.id) flows[flow.id] = flow;
      }
      const order = Object.values(flows)
        .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
        .map((f) => f.id);
      useFlowStore.setState({ flows, order, currentId: null, nodes: [], edges: [] });
    }
  } finally {
    suspended = false;
  }
}

/** Push everything currently in the local stores to the cloud. */
export async function pushWorkspace() {
  if (!userId || suspended) return;
  const uid = userId;
  const bots = useBotStore.getState().bots;
  const { flows } = useFlowStore.getState();

  if (bots.length) {
    await supabase.from("bots").upsert(
      bots.map((bot) => ({
        id: bot.id,
        user_id: uid,
        name: bot.name,
        flow_id: bot.flowId ?? null,
        // Tokens live in public.bot_tokens, never in this browser-readable column.
        data: stripBotSecrets(bot) as unknown as Json,
      })),
      { onConflict: "user_id,id" },
    );
  }

  const flowList = Object.values(flows);
  if (flowList.length) {
    await supabase.from("flows").upsert(
      flowList.map((flow) => ({
        id: flow.id,
        user_id: uid,
        name: flow.name,
        data: flow as unknown as Json,
      })),
      { onConflict: "user_id,id" },
    );
  }
}

function schedulePush() {
  if (!userId || suspended) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void pushWorkspace();
  }, 900);
}

export async function deleteRemoteBot(id: string) {
  if (!userId) return;
  await supabase.from("bots").delete().eq("user_id", userId).eq("id", id);
}

/** Start mirroring local store changes to the cloud for the given user. */
export async function startWorkspaceSync(uid: string) {
  if (userId === uid) return;
  stopWorkspaceSync();
  userId = uid;
  await pullWorkspace(uid);
  await pushWorkspace();

  unsubscribers = [
    useBotStore.subscribe((state, prev) => {
      if (state.bots !== prev.bots) schedulePush();
    }),
    useFlowStore.subscribe((state, prev) => {
      if (state.flows !== prev.flows) schedulePush();
    }),
  ];
}

/** Wipe every locally cached bot/flow (used on sign-out so accounts never mix). */
export function clearLocalWorkspace() {
  useBotStore.setState({ bots: [] });
  useFlowStore.setState({ flows: {}, order: [], currentId: null, nodes: [], edges: [] });
}

export function stopWorkspaceSync() {
  userId = null;
  if (pushTimer) clearTimeout(pushTimer);
  unsubscribers.forEach((fn) => fn());
  unsubscribers = [];
}
