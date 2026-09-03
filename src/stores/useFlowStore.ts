import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { uid } from "@/lib/id";
import { createFlow, createFlowNode } from "@/data/flow-factories";
import { FLOW_EXAMPLES, instantiateExample } from "@/data/flow-examples";
import type { Flow, FlowEdge, FlowNode, FlowNodeData, FlowSnapshot } from "@/types/flow";
import type { AiFlowPlan } from "@/lib/flow-ai.functions";

export type SaveState = "idle" | "saving" | "saved" | "dirty";

interface FlowStore {
  flows: Record<string, Flow>;
  order: string[];
  currentId: string | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  past: FlowSnapshot[];
  future: FlowSnapshot[];
  clipboard: FlowSnapshot | null;
  saveState: SaveState;
  onboarded: boolean;
  hydrated: boolean;

  ensureFlow: (id?: string) => string | null;
  openFlow: (id: string) => void;
  newFlow: (name?: string) => string;
  renameFlow: (name: string) => void;
  markHydrated: () => void;

  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: FlowEdge[]) => void;
  commit: () => void;

  addNode: (type: string, position: { x: number; y: number }) => string;
  addPreparedNode: (node: FlowNode) => string;
  updateNodeData: (id: string, patch: Partial<FlowNodeData>) => void;
  updateNodeConfig: (id: string, key: string, value: string | number | boolean) => void;
  deleteNodes: (ids: string[]) => void;
  duplicateNodes: (ids: string[]) => void;
  toggleNodeEnabled: (id: string) => void;
  connect: (edge: Omit<FlowEdge, "id">) => void;
  deleteEdges: (ids: string[]) => void;

  copy: (ids: string[]) => void;
  cut: (ids: string[]) => void;
  paste: (position?: { x: number; y: number }) => void;

  applyExample: (exampleId: string, mode: "append" | "replace") => string | undefined;
  applyAiPlan: (plan: AiFlowPlan) => void;

  undo: () => void;
  redo: () => void;
  save: () => void;
  markOnboarded: () => void;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let clearTimer: ReturnType<typeof setTimeout> | undefined;

export const useFlowStore = create<FlowStore>()(
  persist(
    (set, get) => {
      const scheduleSave = () => {
        set({ saveState: "dirty" });
        if (saveTimer) clearTimeout(saveTimer);
        if (clearTimer) clearTimeout(clearTimer);
        saveTimer = setTimeout(() => {
          set({ saveState: "saving" });
          get().save();
          set({ saveState: "saved" });
          clearTimer = setTimeout(() => set({ saveState: "idle" }), 2000);
        }, 600);
      };

      const snapshot = (): FlowSnapshot => ({
        nodes: structuredClone(get().nodes),
        edges: structuredClone(get().edges),
      });

      const push = () => set({ past: [...get().past.slice(-49), snapshot()], future: [] });

      const mutate = (nodes: FlowNode[], edges: FlowEdge[] = get().edges) => {
        set({ nodes, edges });
        scheduleSave();
      };

      return {
        flows: {},
        order: [],
        currentId: null,
        nodes: [],
        edges: [],
        past: [],
        future: [],
        clipboard: null,
        saveState: "idle",
        onboarded: false,
        hydrated: false,

        ensureFlow: (id) => {
          const state = get();
          if (!state.hydrated) return null;
          if (id && state.flows[id]) {
            if (state.currentId !== id) state.openFlow(id);
            return id;
          }
          if (!id && state.currentId && state.flows[state.currentId]) return state.currentId;
          const first = state.order[0];
          if (!id && first) {
            state.openFlow(first);
            return first;
          }
          return state.newFlow(id ? "Untitled flow" : "My first flow");
        },

        markHydrated: () => set({ hydrated: true }),

        openFlow: (id) => {
          const flow = get().flows[id];
          if (!flow) return;
          set({
            currentId: id,
            nodes: structuredClone(flow.nodes),
            edges: structuredClone(flow.edges),
            past: [],
            future: [],
            saveState: "idle",
          });
        },

        newFlow: (name = "Untitled flow") => {
          const flow = createFlow(name);
          set({
            flows: { ...get().flows, [flow.id]: flow },
            order: [flow.id, ...get().order],
            currentId: flow.id,
            nodes: [],
            edges: [],
            past: [],
            future: [],
          });
          return flow.id;
        },

        renameFlow: (name) => {
          const id = get().currentId;
          if (!id) return;
          const flow = get().flows[id];
          if (!flow) return;
          set({ flows: { ...get().flows, [id]: { ...flow, name } } });
          scheduleSave();
        },

        setNodes: (nodes) => set({ nodes }),
        setEdges: (edges) => set({ edges }),
        commit: () => {
          push();
          scheduleSave();
        },

        addNode: (type, position) => {
          const node = createFlowNode(type, position);
          push();
          mutate([...get().nodes.map((n) => ({ ...n, selected: false })), { ...node, selected: true }]);
          return node.id;
        },

        addPreparedNode: (node) => {
          push();
          mutate([...get().nodes.map((n) => ({ ...n, selected: false })), { ...node, selected: true }]);
          return node.id;
        },

        updateNodeData: (id, patch) => {
          push();
          mutate(get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
        },

        updateNodeConfig: (id, key, value) => {
          push();
          mutate(
            get().nodes.map((n) =>
              n.id === id ? { ...n, data: { ...n.data, config: { ...n.data.config, [key]: value } } } : n,
            ),
          );
        },

        deleteNodes: (ids) => {
          if (!ids.length) return;
          push();
          const set0 = new Set(ids);
          mutate(
            get().nodes.filter((n) => !set0.has(n.id)),
            get().edges.filter((e) => !set0.has(e.source) && !set0.has(e.target)),
          );
        },

        duplicateNodes: (ids) => {
          if (!ids.length) return;
          push();
          const copies = get()
            .nodes.filter((n) => ids.includes(n.id))
            .map((n) => ({
              ...structuredClone(n),
              id: uid("node"),
              position: { x: n.position.x + 48, y: n.position.y + 48 },
              selected: true,
            }));
          mutate([...get().nodes.map((n) => ({ ...n, selected: false })), ...copies]);
        },

        toggleNodeEnabled: (id) => {
          push();
          mutate(
            get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, enabled: !n.data.enabled } } : n)),
          );
        },

        connect: (edge) => {
          push();
          const exists = get().edges.some(
            (e) => e.source === edge.source && e.target === edge.target && e.sourceHandle === edge.sourceHandle,
          );
          if (exists) return;
          mutate(get().nodes, [...get().edges, { ...edge, id: uid("edge") }]);
        },

        deleteEdges: (ids) => {
          if (!ids.length) return;
          push();
          mutate(
            get().nodes,
            get().edges.filter((e) => !ids.includes(e.id)),
          );
        },

        copy: (ids) => {
          const nodes = structuredClone(get().nodes.filter((n) => ids.includes(n.id)));
          const edges = structuredClone(
            get().edges.filter((e) => ids.includes(e.source) && ids.includes(e.target)),
          );
          set({ clipboard: { nodes, edges } });
        },

        cut: (ids) => {
          get().copy(ids);
          get().deleteNodes(ids);
        },

        paste: (position) => {
          const clip = get().clipboard;
          if (!clip || !clip.nodes.length) return;
          push();
          const idMap = new Map<string, string>();
          const base = clip.nodes[0]!.position;
          const nodes = clip.nodes.map((n) => {
            const id = uid("node");
            idMap.set(n.id, id);
            return {
              ...structuredClone(n),
              id,
              selected: true,
              position: position
                ? { x: position.x + (n.position.x - base.x), y: position.y + (n.position.y - base.y) }
                : { x: n.position.x + 60, y: n.position.y + 60 },
            };
          });
          const edges = clip.edges.map((e) => ({
            ...e,
            id: uid("edge"),
            source: idMap.get(e.source) ?? e.source,
            target: idMap.get(e.target) ?? e.target,
          }));
          mutate([...get().nodes.map((n) => ({ ...n, selected: false })), ...nodes], [...get().edges, ...edges]);
        },

        applyAiPlan: (plan) => {
          push();
          const existing = plan.mode === "replace" ? [] : get().nodes;
          const existingEdges = plan.mode === "replace" ? [] : get().edges;
          const baseX = existing.length ? Math.max(...existing.map((n) => n.position.x)) + 420 : 0;
          const idMap = new Map<string, string>();
          const created = plan.nodes.map((n, i) => {
            const node = createFlowNode(n.type, { x: baseX + (i % 2) * 40, y: i * 190 }, {
              title: n.title || undefined,
              config: n.config as Record<string, string>,
            } as Partial<FlowNodeData>);
            idMap.set(n.key, node.id);
            return node;
          });
          const resolve = (key: string) => idMap.get(key) ?? key;
          const allIds = new Set([...existing.map((n) => n.id), ...created.map((n) => n.id)]);
          const newEdges: FlowEdge[] = plan.edges
            .map((e) => ({
              id: uid("edge"),
              source: resolve(e.from),
              target: resolve(e.to),
              sourceHandle: e.fromHandle ?? "out",
              targetHandle: "in",
            }))
            .filter((e) => allIds.has(e.source) && allIds.has(e.target) && e.source !== e.target);
          mutate(
            [
              ...existing.map((n) => ({ ...n, selected: false })),
              ...created.map((n, i) => ({ ...n, selected: i === 0 })),
            ],
            [...existingEdges, ...newEdges],
          );
        },

        applyExample: (exampleId, mode) => {
          const example = FLOW_EXAMPLES.find((e) => e.id === exampleId);
          if (!example) return undefined;
          push();
          const existing = get().nodes;
          const offsetX =
            mode === "append" && existing.length
              ? Math.max(...existing.map((n) => n.position.x)) + 420
              : 0;
          const { nodes, edges, triggerId } = instantiateExample(example, { x: offsetX, y: 0 });
          const selected = nodes.map((n) => ({ ...n, selected: n.id === triggerId }));
          if (mode === "replace") {
            mutate(selected, edges);
          } else {
            mutate([...existing.map((n) => ({ ...n, selected: false })), ...selected], [...get().edges, ...edges]);
          }
          return triggerId;
        },

        undo: () => {
          const past = get().past;
          const prev = past[past.length - 1];
          if (!prev) return;
          set({
            past: past.slice(0, -1),
            future: [snapshot(), ...get().future].slice(0, 50),
            nodes: prev.nodes,
            edges: prev.edges,
          });
          scheduleSave();
        },

        redo: () => {
          const [next, ...rest] = get().future;
          if (!next) return;
          set({
            past: [...get().past, snapshot()],
            future: rest,
            nodes: next.nodes,
            edges: next.edges,
          });
          scheduleSave();
        },

        save: () => {
          const { currentId, flows, nodes, edges } = get();
          if (!currentId) return;
          const flow = flows[currentId];
          if (!flow) return;
          set({
            flows: {
              ...flows,
              [currentId]: {
                ...flow,
                nodes: structuredClone(nodes),
                edges: structuredClone(edges),
                updatedAt: new Date().toISOString(),
              },
            },
          });
        },

        markOnboarded: () => set({ onboarded: true }),
      };
    },
    {
      name: "bottly.flows.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ flows: s.flows, order: s.order, currentId: s.currentId, onboarded: s.onboarded }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    },
  ),
);

export function currentFlow(): Flow | undefined {
  const { currentId, flows } = useFlowStore.getState();
  return currentId ? flows[currentId] : undefined;
}
