import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { BottlyNode, type BottlyFlowNode } from "@/components/flow/BottlyNode";
import { useFlowStore } from "@/stores/useFlowStore";
import { CanvasToolbar } from "@/components/flow/CanvasToolbar";
import { Plus, Sparkles } from "lucide-react";
import type { FlowEdge, FlowNode } from "@/types/flow";

const nodeTypes = { bottly: BottlyNode };

function toRfEdge(e: FlowEdge) {
  const isFalse = e.sourceHandle === "false" || e.sourceHandle === "blocked";
  const isTrue = e.sourceHandle === "true";
  const color = isTrue ? "#23A55A" : isFalse ? "#ED4245" : "#5865F2";
  return {
    ...e,
    type: "smoothstep" as const,
    animated: true,
    style: { stroke: color, strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 18, height: 18 },
  };
}

interface Props {
  onCreateCommand: () => void;
  onBrowseExamples: () => void;
}

export function FlowCanvas({ onCreateCommand, onBrowseExamples }: Props) {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const setNodes = useFlowStore((s) => s.setNodes);
  const setEdges = useFlowStore((s) => s.setEdges);
  const commit = useFlowStore((s) => s.commit);
  const connect = useFlowStore((s) => s.connect);
  const addNode = useFlowStore((s) => s.addNode);
  const deleteNodes = useFlowStore((s) => s.deleteNodes);
  const duplicateNodes = useFlowStore((s) => s.duplicateNodes);
  const toggleNodeEnabled = useFlowStore((s) => s.toggleNodeEnabled);
  const copy = useFlowStore((s) => s.copy);
  const cut = useFlowStore((s) => s.cut);
  const paste = useFlowStore((s) => s.paste);

  const wrapper = useRef<HTMLDivElement | null>(null);
  const [instance, setInstance] = useState<ReactFlowInstance<BottlyFlowNode> | null>(null);
  const [menuNodeId, setMenuNodeId] = useState<string | null>(null);
  const lastPointer = useRef({ x: 0, y: 0 });
  const rf = useReactFlow();

  const onNodesChange = useCallback(
    (changes: NodeChange<BottlyFlowNode>[]) => {
      const structural = changes.some(
        (c) => c.type === "remove" || (c.type === "position" && c.dragging === false),
      );
      if (structural) commit();
      setNodes(applyNodeChanges(changes, nodes as unknown as BottlyFlowNode[]) as unknown as FlowNode[]);
    },
    [nodes, setNodes, commit],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (changes.some((c) => c.type === "remove")) commit();
      setEdges(applyEdgeChanges(changes, edges.map(toRfEdge)) as unknown as FlowEdge[]);
    },
    [edges, setEdges, commit],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return;
      connect({
        source: c.source,
        target: c.target,
        sourceHandle: c.sourceHandle ?? "out",
        targetHandle: c.targetHandle ?? "in",
      });
    },
    [connect],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/bottly-node");
      if (!type || !instance) return;
      const position = instance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(type, { x: position.x - 124, y: position.y - 40 });
    },
    [instance, addNode],
  );

  const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
  const empty = nodes.length === 0;

  const flowPoint = () =>
    instance ? instance.screenToFlowPosition(lastPointer.current) : { x: 0, y: 0 };

  return (
    <div
      ref={wrapper}
      className="relative h-full w-full bg-[#111214]"
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={handleDrop}
      onPointerDown={(e) => {
        lastPointer.current = { x: e.clientX, y: e.clientY };
      }}
      onContextMenu={(e) => {
        lastPointer.current = { x: e.clientX, y: e.clientY };
      }}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="h-full w-full">
            <ReactFlow<BottlyFlowNode>
              nodes={nodes as unknown as BottlyFlowNode[]}
              edges={edges.map(toRfEdge)}
              nodeTypes={nodeTypes}
              onInit={setInstance}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeContextMenu={(_, node) => setMenuNodeId(node.id)}
              onPaneContextMenu={() => setMenuNodeId(null)}
              onNodeDragStart={() => commit()}
              snapToGrid
              snapGrid={[16, 16]}
              minZoom={0.2}
              maxZoom={2}
              panOnScroll
              selectionOnDrag
              multiSelectionKeyCode={["Meta", "Shift", "Control"]}
              deleteKeyCode={null}
              fitView
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{ type: "smoothstep", animated: true }}
              className="bottly-flow"
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={16}
                size={1}
                color="#2B2D31"
                bgColor="#111214"
              />
              <MiniMapToggle />
            </ReactFlow>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {menuNodeId ? (
            <>
              <ContextMenuItem onSelect={() => setNodes(nodes.map((n) => ({ ...n, selected: n.id === menuNodeId })))}>
                Edit
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => duplicateNodes([menuNodeId])}>Duplicate</ContextMenuItem>
              <ContextMenuItem onSelect={() => copy([menuNodeId])}>Copy</ContextMenuItem>
              <ContextMenuItem onSelect={() => cut([menuNodeId])}>Cut</ContextMenuItem>
              <ContextMenuItem onSelect={() => toggleNodeEnabled(menuNodeId)}>Enable / Disable</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem className="text-[#ED4245]" onSelect={() => deleteNodes([menuNodeId])}>
                Delete
              </ContextMenuItem>
            </>
          ) : (
            <>
              <ContextMenuItem onSelect={() => paste(flowPoint())}>Paste</ContextMenuItem>
              <ContextMenuItem onSelect={() => setNodes(nodes.map((n) => ({ ...n, selected: true })))}>
                Select All
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => rf.fitView({ padding: 0.2, duration: 300 })}>Fit View</ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => addNode("send-embed", flowPoint())}>Add Send Embed</ContextMenuItem>
              <ContextMenuItem onSelect={() => addNode("if-else", flowPoint())}>Add If / Else</ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {empty && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="pointer-events-auto max-w-sm rounded-xl border border-white/8 bg-[#18191C]/90 p-6 text-center backdrop-blur-sm">
            <h2 className="text-[15px] font-semibold text-[#F2F3F5]">Your canvas is empty.</h2>
            <p className="mt-1 text-[13px] text-[#B5BAC1]">
              Start by creating a command or choosing an example.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button size="sm" className="gap-1.5 bg-[#5865F2] text-white hover:bg-[#4752C4]" onClick={onCreateCommand}>
                <Plus className="size-4" aria-hidden="true" />
                Create New Command
              </Button>
              <Button size="sm" variant="secondary" className="gap-1.5 bg-[#2B2D31] text-[#F2F3F5]" onClick={onBrowseExamples}>
                <Sparkles className="size-4" aria-hidden="true" />
                Browse Examples
              </Button>
            </div>
            <p className="mt-4 text-[11px] text-[#72767d]">Drag nodes here to start building.</p>
          </div>
        </div>
      )}

      <CanvasToolbar selectedCount={selectedIds.length} />
    </div>
  );
}

function MiniMapToggle() {
  const show = useFlowStore((s) => s.nodes.length > 0);
  const [visible] = [true];
  if (!show || !visible) return null;
  return (
    <MiniMap
      pannable
      zoomable
      className="!bottom-14 !right-3 !rounded-md !border !border-white/10 !bg-[#18191C]"
      maskColor="rgba(17,18,20,0.75)"
      nodeColor="#5865F2"
      nodeStrokeWidth={0}
      id="bottly-minimap"
    />
  );
}
