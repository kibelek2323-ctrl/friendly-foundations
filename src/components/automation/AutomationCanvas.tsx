import { useCallback, useMemo } from "react";
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Filter, Play, Zap } from "lucide-react";
import type { Automation, AutomationNode, AutomationNodeKind } from "@/types/bot";
import { cn } from "@/lib/utils";

type FlowNodeData = { label: string; kind: AutomationNodeKind; subtitle: string };

const KIND_STYLES: Record<AutomationNodeKind, { ring: string; chip: string; icon: typeof Zap; name: string }> = {
  trigger: { ring: "border-primary", chip: "bg-primary/15 text-primary", icon: Zap, name: "Trigger" },
  condition: { ring: "border-warning", chip: "bg-warning/15 text-warning", icon: Filter, name: "Condition" },
  action: { ring: "border-success", chip: "bg-success/15 text-success", icon: Play, name: "Action" },
};

function FlowNode({ data, selected }: NodeProps) {
  const d = data as FlowNodeData;
  const cfg = KIND_STYLES[d.kind];
  const Icon = cfg.icon;
  return (
    <div
      className={cn(
        "w-56 rounded-lg border bg-card px-3 py-2.5 shadow-panel",
        cfg.ring,
        selected && "ring-2 ring-ring",
      )}
    >
      {d.kind !== "trigger" && <Handle type="target" position={Position.Top} className="!size-2 !bg-border" />}
      <div className="flex items-center gap-2">
        <span className={cn("flex size-6 items-center justify-center rounded-md", cfg.chip)}>
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{cfg.name}</p>
          <p className="truncate text-sm font-medium text-foreground">{d.label}</p>
        </div>
      </div>
      {d.subtitle && <p className="mt-1.5 truncate text-xs text-muted-foreground">{d.subtitle}</p>}
      <Handle type="source" position={Position.Bottom} className="!size-2 !bg-border" />
    </div>
  );
}

const nodeTypes = { bottly: FlowNode };

export function AutomationCanvas({
  automation,
  onChange,
  onSelect,
  selectedId,
}: {
  automation: Automation;
  onChange: (patch: Partial<Automation>) => void;
  onSelect: (id: string | null) => void;
  selectedId: string | null;
}) {
  const nodes: Node[] = useMemo(
    () =>
      automation.nodes.map((n) => ({
        id: n.id,
        type: "bottly",
        position: n.position,
        selected: n.id === selectedId,
        data: {
          label: n.label,
          kind: n.kind,
          subtitle: Object.values(n.config).filter(Boolean).join(" · "),
        } satisfies FlowNodeData,
      })),
    [automation.nodes, selectedId],
  );

  const edges: Edge[] = useMemo(
    () =>
      automation.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: true,
        style: { stroke: "oklch(0.5774 0.2091 273.85)" },
      })),
    [automation.edges],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const next = applyNodeChanges(changes, nodes);
      const byId = new Map(next.map((n) => [n.id, n]));
      onChange({
        nodes: automation.nodes.map<AutomationNode>((n) => {
          const updated = byId.get(n.id);
          return updated ? { ...n, position: updated.position } : n;
        }),
      });
      const removed = changes.filter((c) => c.type === "remove").map((c) => c.id);
      if (removed.length) {
        onChange({
          nodes: automation.nodes.filter((n) => !removed.includes(n.id)),
          edges: automation.edges.filter((e) => !removed.includes(e.source) && !removed.includes(e.target)),
        });
      }
    },
    [automation.edges, automation.nodes, nodes, onChange],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const next = applyEdgeChanges(changes, edges);
      onChange({ edges: next.map((e) => ({ id: e.id, source: e.source, target: e.target })) });
    },
    [edges, onChange],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const next = addEdge(connection, edges);
      onChange({ edges: next.map((e) => ({ id: e.id, source: e.source, target: e.target })) });
    },
    [edges, onChange],
  );

  return (
    <div className="h-[560px] w-full overflow-hidden rounded-lg border border-border bg-surface">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, n) => onSelect(n.id)}
        onPaneClick={() => onSelect(null)}
        fitView
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
      >
        <Background gap={20} color="oklch(0.3368 0.0092 268.39)" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="!bg-card" maskColor="rgba(0,0,0,0.6)" />
      </ReactFlow>
    </div>
  );
}
