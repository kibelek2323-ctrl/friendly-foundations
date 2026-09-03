import { uid } from "@/lib/id";
import { createComponent, createEmbed } from "@/data/factories";
import { getNodeDef } from "@/data/node-catalog";
import type { ConfigValue, Flow, FlowNode, FlowNodeData } from "@/types/flow";
import type { Embed } from "@/types/bot";

export function createFlowNode(
  type: string,
  position: { x: number; y: number },
  overrides: Partial<FlowNodeData> = {},
): FlowNode {
  const def = getNodeDef(type);
  const data: FlowNodeData = {
    type,
    title: def.title,
    enabled: true,
    config: { ...(def.defaults ?? {}) },
    ...(def.hasEmbed
      ? {
          embed: createEmbed({
            title: def.type === "send-embed" ? "New embed" : def.title,
            description: "Describe what happens here.",
            fields: [],
          }),
        }
      : {}),
    ...(def.hasCommandOptions ? { options: [] } : {}),
    ...overrides,
  };
  if (overrides.config) data.config = { ...(def.defaults ?? {}), ...overrides.config };
  return { id: uid("node"), type: "bottly", position, data };
}

export function createFlow(name = "Untitled flow", description = ""): Flow {
  const now = new Date().toISOString();
  return { id: uid("flow"), name, description, nodes: [], edges: [], createdAt: now, updatedAt: now };
}

export function createCommandFlowNodes(name: string, description: string) {
  const node = createFlowNode(
    "slash-command",
    { x: 0, y: 0 },
    {
      title: `/${name}`,
      config: { name, description } as Record<string, ConfigValue>,
      options: [
        { id: uid("opt"), name: "user", description: "Target user", type: "user", required: true, autocomplete: false },
        {
          id: uid("opt"),
          name: "reason",
          description: "Reason for this action",
          type: "string",
          required: false,
          autocomplete: false,
        },
      ],
    },
  );
  return node;
}

export function embedWith(partial: Partial<Embed>): Embed {
  return createEmbed(partial);
}

export function buttonComponent(label: string, style: "primary" | "secondary" | "success" | "danger" = "primary") {
  const c = createComponent("button");
  c.label = label;
  c.style = style;
  return c;
}
