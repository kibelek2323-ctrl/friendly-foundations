import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Copy,
  Cpu,
  Loader2,
  MemoryStick,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Server,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { amIAdmin } from "@/lib/admin-codes.functions";
import {
  createHostingNode,
  deleteHostingNode,
  disconnectHostingNode,
  getHostingNodes,
  regenerateHostingPairingCode,
  setHostingNodeDisabled,
} from "@/lib/hosting.functions";
import type { HostingNode } from "@/lib/hosting/hosting-manager.server";

export const Route = createFileRoute("/_authenticated/admin/hosting")({
  head: () => ({
    meta: [
      { title: "Hosting nodes — Bottly admin" },
      { name: "description", content: "Manage Bottly hosting nodes, pairing and health." },
      { property: "og:title", content: "Hosting nodes — Bottly admin" },
      { property: "og:description", content: "Manage Bottly hosting nodes, pairing and health." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const STATUS_STYLES: Record<HostingNode["status"], string> = {
  online: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  offline: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  disabled: "bg-red-500/15 text-red-400 border-red-500/30",
};

function fmtBytes(value: number | null): string {
  if (value == null || value <= 0) return "—";
  const gb = value / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(value / 1024 ** 2).toFixed(0)} MB`;
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function Page() {
  const checkAdmin = useServerFn(amIAdmin);
  const loadNodes = useServerFn(getHostingNodes);
  const createFn = useServerFn(createHostingNode);
  const regenFn = useServerFn(regenerateHostingPairingCode);
  const disableFn = useServerFn(setHostingNodeDisabled);
  const disconnectFn = useServerFn(disconnectHostingNode);
  const deleteFn = useServerFn(deleteHostingNode);

  const { data: isAdmin, isLoading: checking } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin(),
    staleTime: 5 * 60 * 1000,
  });

  const nodes = useQuery({
    queryKey: ["admin-hosting-nodes"],
    queryFn: () => loadNodes(),
    enabled: isAdmin === true,
    refetchInterval: 15_000,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [pairing, setPairing] = useState<{ code: string; expiresInMinutes: number; name: string } | null>(null);
  const [selected, setSelected] = useState<HostingNode | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<HostingNode | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  const createNode = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const result = await createFn({ data: { name: newName.trim() } });
      setPairing({ code: result.pairingCode, expiresInMinutes: result.expiresInMinutes, name: result.node.name });
      setNewName("");
      void nodes.refetch();
    } catch {
      toast.error("Could not create the node");
    } finally {
      setCreating(false);
    }
  };

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      void nodes.refetch();
      setSelected(null);
    } catch {
      toast.error("Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <AppShell title="Hosting">
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Hosting">
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">Admins only.</p>
        </div>
      </AppShell>
    );
  }

  const list = nodes.data ?? [];

  return (
    <AppShell title="Hosting">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Hosting nodes</h1>
            <p className="text-sm text-muted-foreground">
              Machines running the Bottly worker. Pair them with a one-time code.
            </p>
          </div>
          <Button onClick={() => { setPairing(null); setAddOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Add hosting node
          </Button>
        </div>

        {nodes.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
            No hosting nodes yet. Add one to get a pairing code.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((node) => (
              <button
                key={node.id}
                onClick={() => setSelected(node)}
                className="rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{node.name}</span>
                  </div>
                  <Badge variant="outline" className={STATUS_STYLES[node.status]}>
                    {node.status}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div>{node.hostname ?? "Not paired yet"}</div>
                  <div>Bots: {node.botCount} · Heartbeat: {fmtDate(node.lastHeartbeat)}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Add node dialog */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add hosting node</DialogTitle>
              <DialogDescription>
                {pairing
                  ? "Run this command on the machine. The code is shown only once."
                  : "Name the node, then pair the worker with a one-time code."}
              </DialogDescription>
            </DialogHeader>
            {pairing ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3 font-mono text-sm">
                  <code className="flex-1 break-all">node src/index.mjs pair {pairing.code}</code>
                  <Button size="icon" variant="ghost" onClick={() => void copy(`node src/index.mjs pair ${pairing.code}`)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Code expires in {pairing.expiresInMinutes} minutes.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  placeholder="e.g. VPS Frankfurt 1"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={80}
                />
              </div>
            )}
            <DialogFooter>
              {pairing ? (
                <Button onClick={() => setAddOpen(false)}>Done</Button>
              ) : (
                <Button onClick={() => void createNode()} disabled={creating || !newName.trim()}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Node details dialog */}
        <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" /> {selected?.name}
              </DialogTitle>
              <DialogDescription>Node details and controls.</DialogDescription>
            </DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Detail label="Status" value={selected.status} />
                  <Detail label="Hostname" value={selected.hostname ?? "—"} />
                  <Detail label="Platform" value={selected.platform ?? "—"} />
                  <Detail label="Docker" value={selected.dockerVersion ?? "—"} />
                  <Detail
                    label="CPU"
                    value={selected.cpuUsage != null ? `${selected.cpuUsage.toFixed(0)}%` : "—"}
                    icon={<Cpu className="h-3.5 w-3.5" />}
                  />
                  <Detail
                    label="Memory"
                    value={`${fmtBytes(selected.memoryUsage)} / ${fmtBytes(selected.totalMemory)}`}
                    icon={<MemoryStick className="h-3.5 w-3.5" />}
                  />
                  <Detail label="Bots" value={String(selected.botCount)} />
                  <Detail label="Last heartbeat" value={fmtDate(selected.lastHeartbeat)} />
                  <Detail label="Connected at" value={fmtDate(selected.connectedAt)} />
                  <Detail label="Paired at" value={fmtDate(selected.pairedAt)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(async () => {
                        const { pairingCode, expiresInMinutes } = await regenFn({ data: { id: selected.id } });
                        setPairing({ code: pairingCode, expiresInMinutes, name: selected.name });
                        setAddOpen(true);
                      }, "New pairing code generated")
                    }
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> New pairing code
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () => disableFn({ data: { id: selected.id, disabled: selected.status !== "disabled" } }),
                        selected.status === "disabled" ? "Node enabled" : "Node disabled",
                      )
                    }
                  >
                    {selected.status === "disabled" ? (
                      <><Power className="mr-2 h-4 w-4" /> Enable</>
                    ) : (
                      <><PowerOff className="mr-2 h-4 w-4" /> Disable</>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void run(() => disconnectFn({ data: { id: selected.id } }), "Node disconnected")}
                  >
                    <PowerOff className="mr-2 h-4 w-4" /> Disconnect
                  </Button>
                  <Button size="sm" variant="destructive" disabled={busy} onClick={() => setConfirmDelete(selected)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={confirmDelete !== null} onOpenChange={(open) => !open && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete node “{confirmDelete?.name}”?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the node and invalidates its token. The worker on that machine will stop reporting.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  const node = confirmDelete;
                  setConfirmDelete(null);
                  if (node) void run(() => deleteFn({ data: { id: node.id } }), "Node deleted");
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}

function Detail({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate font-medium">{value}</div>
    </div>
  );
}
