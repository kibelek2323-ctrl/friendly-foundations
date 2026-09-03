import { useEffect, useState } from "react";
import { Copy, Plus, Trash2, Workflow } from "lucide-react";
import type { Automation, AutomationNode } from "@/types/bot";
import { ACTIONS, CONDITIONS, TRIGGERS } from "@/data/catalog";
import { createAutomation } from "@/data/factories";
import { uid } from "@/lib/id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common/EmptyState";
import { AutomationCanvas } from "./AutomationCanvas";
import { useHydrated } from "@/hooks/useHydrated";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function AutomationsWorkspace({
  automations,
  onChange,
}: {
  automations: Automation[];
  onChange: (next: Automation[]) => void;
}) {
  const hydrated = useHydrated();
  const [activeId, setActiveId] = useState<string | null>(automations[0]?.id ?? null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!automations.find((a) => a.id === activeId)) setActiveId(automations[0]?.id ?? null);
  }, [automations, activeId]);

  const active = automations.find((a) => a.id === activeId) ?? null;
  const selectedNode = active?.nodes.find((n) => n.id === selectedNodeId) ?? null;

  const patchActive = (patch: Partial<Automation>) => {
    if (!active) return;
    onChange(automations.map((a) => (a.id === active.id ? { ...a, ...patch } : a)));
  };

  const addAutomation = () => {
    const a = createAutomation({ name: `Automation ${automations.length + 1}` });
    onChange([...automations, a]);
    setActiveId(a.id);
  };

  const addNode = (kind: AutomationNode["kind"], type: string, label: string) => {
    if (!active) return;
    const node: AutomationNode = {
      id: uid("nd"),
      kind,
      type,
      label,
      config: {},
      position: { x: 320, y: 60 + active.nodes.length * 40 },
    };
    patchActive({ nodes: [...active.nodes, node] });
    setSelectedNodeId(node.id);
  };

  const updateNode = (id: string, patch: Partial<AutomationNode>) => {
    if (!active) return;
    patchActive({ nodes: active.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) });
  };

  const deleteNode = (id: string) => {
    if (!active) return;
    patchActive({
      nodes: active.nodes.filter((n) => n.id !== id),
      edges: active.edges.filter((e) => e.source !== id && e.target !== id),
    });
    setSelectedNodeId(null);
  };

  const duplicateNode = (id: string) => {
    if (!active) return;
    const src = active.nodes.find((n) => n.id === id);
    if (!src) return;
    const copy: AutomationNode = {
      ...structuredClone(src),
      id: uid("nd"),
      position: { x: src.position.x + 40, y: src.position.y + 40 },
    };
    patchActive({ nodes: [...active.nodes, copy] });
    setSelectedNodeId(copy.id);
  };

  if (automations.length === 0) {
    return (
      <EmptyState
        icon={Workflow}
        title="No automations yet."
        description="Chain a trigger, conditions and actions to make your bot react automatically."
        actionLabel="Create automation"
        onAction={addAutomation}
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
      <section className="panel p-3" aria-label="Automations">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Workflows</h2>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={addAutomation}>
            <Plus className="size-4" /> New
          </Button>
        </div>
        <ul className="space-y-1.5">
          {automations.map((a) => (
            <li key={a.id}>
              <div
                className={cn(
                  "flex items-center gap-2 rounded-md border border-border px-2 py-2",
                  activeId === a.id && "border-primary bg-elevated",
                )}
              >
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setActiveId(a.id)}>
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.nodes.length} nodes · {a.enabled ? "Enabled" : "Disabled"}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${a.name}`}
                  onClick={() => onChange(automations.filter((x) => x.id !== a.id))}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>

        {active && (
          <div className="mt-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add node</h3>
            <Tabs defaultValue="trigger">
              <TabsList className="w-full">
                <TabsTrigger value="trigger" className="flex-1 text-xs">
                  Triggers
                </TabsTrigger>
                <TabsTrigger value="condition" className="flex-1 text-xs">
                  Logic
                </TabsTrigger>
                <TabsTrigger value="action" className="flex-1 text-xs">
                  Actions
                </TabsTrigger>
              </TabsList>
              {(
                [
                  ["trigger", TRIGGERS],
                  ["condition", CONDITIONS],
                  ["action", ACTIONS],
                ] as const
              ).map(([kind, defs]) => (
                <TabsContent key={kind} value={kind} className="max-h-64 space-y-1 overflow-y-auto pt-2">
                  {defs.map((d) => (
                    <button
                      key={d.type}
                      type="button"
                      onClick={() => addNode(kind, d.type, d.label)}
                      className="w-full rounded-md border border-border px-2 py-1.5 text-left text-xs transition hover:border-primary/60 hover:bg-elevated"
                    >
                      {d.label}
                    </button>
                  ))}
                </TabsContent>
              ))}
            </Tabs>
          </div>
        )}
      </section>

      <section aria-label="Workflow canvas">
        {active ? (
          hydrated ? (
            <AutomationCanvas
              automation={active}
              onChange={patchActive}
              onSelect={setSelectedNodeId}
              selectedId={selectedNodeId}
            />
          ) : (
            <Skeleton className="h-[560px] w-full rounded-lg" />
          )
        ) : null}
      </section>

      <section className="panel space-y-4 p-4" aria-label="Automation settings">
        {active && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="auto-name">Name</Label>
              <Input id="auto-name" value={active.name} onChange={(e) => patchActive({ name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="auto-desc">Description</Label>
              <Textarea id="auto-desc" rows={2} value={active.description} onChange={(e) => patchActive({ description: e.target.value })} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <Label htmlFor="auto-enabled" className="text-sm">
                Enabled
              </Label>
              <Switch id="auto-enabled" checked={active.enabled} onCheckedChange={(v) => patchActive({ enabled: v })} />
            </div>
          </>
        )}

        <div className="border-t border-border pt-4">
          <h3 className="mb-2 text-sm font-semibold">Selected node</h3>
          {!selectedNode ? (
            <p className="text-sm text-muted-foreground">Click a node on the canvas to configure it.</p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="node-label">Label</Label>
                <Input id="node-label" value={selectedNode.label} onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="node-config">Configuration</Label>
                <Input
                  id="node-config"
                  placeholder="e.g. #welcome or @Verified"
                  value={selectedNode.config["value"] ?? ""}
                  onChange={(e) => updateNode(selectedNode.id, { config: { ...selectedNode.config, value: e.target.value } })}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => duplicateNode(selectedNode.id)}>
                  <Copy className="size-3.5" /> Duplicate
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => deleteNode(selectedNode.id)}>
                  <Trash2 className="size-3.5 text-destructive" /> Delete
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
