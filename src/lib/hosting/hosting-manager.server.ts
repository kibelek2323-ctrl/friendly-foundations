import { createHash, randomBytes } from "crypto";

export const HEARTBEAT_TIMEOUT_MS = 90_000;
export const PAIRING_CODE_TTL_MS = 10 * 60 * 1000;

export type NodeStatus = "pending" | "online" | "offline" | "disabled";

export interface HostingNode {
  id: string;
  name: string;
  status: NodeStatus;
  pairedAt: string | null;
  hostname: string | null;
  platform: string | null;
  dockerVersion: string | null;
  cpuUsage: number | null;
  memoryUsage: number | null;
  totalMemory: number | null;
  botCount: number;
  lastHeartbeat: string | null;
  connectedAt: string | null;
  createdAt: string;
  pairingExpiresAt: string | null;
}

export function hashSecret(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex").toUpperCase();
}

export function generatePairingCode(): string {
  const part = () => randomBytes(2).toString("hex").toUpperCase();
  return `BOTTLY-${part()}-${part()}`;
}

export function generateNodeToken(): string {
  return randomBytes(32).toString("hex");
}

interface NodeRow {
  id: string;
  name: string;
  status: NodeStatus;
  paired_at: string | null;
  hostname: string | null;
  platform: string | null;
  docker_version: string | null;
  cpu_usage: number | null;
  memory_usage: number | null;
  total_memory: number | null;
  bot_count: number;
  last_heartbeat: string | null;
  connected_at: string | null;
  created_at: string;
  pairing_expires_at: string | null;
}

function toNode(r: NodeRow): HostingNode {
  let status = r.status;
  if (
    status === "online" &&
    r.last_heartbeat &&
    Date.now() - new Date(r.last_heartbeat).getTime() > HEARTBEAT_TIMEOUT_MS
  ) {
    status = "offline";
  }
  return {
    id: r.id,
    name: r.name,
    status,
    pairedAt: r.paired_at,
    hostname: r.hostname,
    platform: r.platform,
    dockerVersion: r.docker_version,
    cpuUsage: r.cpu_usage,
    memoryUsage: r.memory_usage,
    totalMemory: r.total_memory,
    botCount: r.bot_count ?? 0,
    lastHeartbeat: r.last_heartbeat,
    connectedAt: r.connected_at,
    createdAt: r.created_at,
    pairingExpiresAt: r.pairing_expires_at,
  };
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const SELECT =
  "id, name, status, paired_at, hostname, platform, docker_version, cpu_usage, memory_usage, total_memory, bot_count, last_heartbeat, connected_at, created_at, pairing_expires_at";

export async function listNodes(): Promise<HostingNode[]> {
  const db = await admin();
  const { data, error } = await db.from("hosting_nodes").select(SELECT).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toNode(r as NodeRow));
}

export async function getNode(id: string): Promise<HostingNode | null> {
  const db = await admin();
  const { data, error } = await db.from("hosting_nodes").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toNode(data as NodeRow) : null;
}

export async function createNode(
  name: string,
  createdBy: string,
): Promise<{ node: HostingNode; pairingCode: string }> {
  const db = await admin();
  const pairingCode = generatePairingCode();
  const { data, error } = await db
    .from("hosting_nodes")
    .insert({
      name,
      status: "pending",
      pairing_code_hash: hashSecret(pairingCode),
      pairing_expires_at: new Date(Date.now() + PAIRING_CODE_TTL_MS).toISOString(),
      created_by: createdBy,
    })
    .select(SELECT)
    .single();
  if (error) throw new Error(error.message);
  return { node: toNode(data as NodeRow), pairingCode };
}

export async function regeneratePairingCode(id: string): Promise<string> {
  const db = await admin();
  const pairingCode = generatePairingCode();
  const { error } = await db
    .from("hosting_nodes")
    .update({
      status: "pending",
      pairing_code_hash: hashSecret(pairingCode),
      pairing_expires_at: new Date(Date.now() + PAIRING_CODE_TTL_MS).toISOString(),
      node_token_hash: null,
      paired_at: null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return pairingCode;
}

export async function setNodeDisabled(id: string, disabled: boolean): Promise<void> {
  const db = await admin();
  const { error } = await db
    .from("hosting_nodes")
    .update({ status: disabled ? "disabled" : "offline" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function disconnectNode(id: string): Promise<void> {
  const db = await admin();
  const { error } = await db
    .from("hosting_nodes")
    .update({ status: "offline", last_heartbeat: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteNode(id: string): Promise<void> {
  const db = await admin();
  const { error } = await db.from("hosting_nodes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export interface PairIdentity {
  hostname?: string;
  platform?: string;
  dockerVersion?: string;
}

export async function pairNode(
  code: string,
  identity: PairIdentity,
): Promise<{ ok: true; nodeId: string; name: string; token: string } | { ok: false; error: string }> {
  const db = await admin();
  const token = generateNodeToken();
  const { data, error } = await db.rpc("pair_hosting_node", {
    _code_hash: hashSecret(code.trim().toUpperCase()),
    _token_hash: hashSecret(token),
    _hostname: identity.hostname ?? "",
    _platform: identity.platform ?? "",
    _docker_version: identity.dockerVersion ?? "",
  });
  if (error) return { ok: false, error: error.message };
  const result = data as { ok: boolean; error?: string; nodeId?: string; name?: string };
  if (!result?.ok) return { ok: false, error: result?.error ?? "Pairing failed." };
  return { ok: true, nodeId: result.nodeId!, name: result.name!, token };
}

export interface NodeMetrics {
  hostname?: string;
  platform?: string;
  dockerVersion?: string;
  cpuUsage?: number;
  memoryUsage?: number;
  totalMemory?: number;
  botCount?: number;
}

export async function heartbeatNode(
  token: string,
  metrics: NodeMetrics,
): Promise<{ ok: boolean; error?: string }> {
  const db = await admin();
  const { data, error } = await db.rpc("heartbeat_hosting_node", {
    _token_hash: hashSecret(token),
    _hostname: metrics.hostname ?? "",
    _platform: metrics.platform ?? "",
    _docker_version: metrics.dockerVersion ?? "",
    _cpu_usage: metrics.cpuUsage ?? 0,
    _memory_usage: metrics.memoryUsage ?? 0,
    _total_memory: metrics.totalMemory ?? 0,
    _bot_count: metrics.botCount ?? 0,
  });
  if (error) return { ok: false, error: error.message };
  const result = data as { ok: boolean; error?: string };
  return { ok: result?.ok === true, error: result?.error };
}
