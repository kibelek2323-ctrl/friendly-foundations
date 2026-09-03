import type { Embed, BotComponent, CommandOption } from "@/types/bot";

export type NodeCategory =
  | "triggers"
  | "messages"
  | "components"
  | "moderation"
  | "logic"
  | "data"
  | "variables";

export type FieldKind =
  | "text"
  | "rich"
  | "textarea"
  | "number"
  | "switch"
  | "select"
  | "color";

export interface NodeField {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
}

export interface FlowNodeDef {
  type: string;
  title: string;
  icon: string;
  category: NodeCategory;
  description: string;
  inputs: number;
  outputs: string[];
  fields: NodeField[];
  /** Node carries a Discord embed payload. */
  hasEmbed?: boolean;
  /** Node carries interactive Discord components. */
  hasComponents?: boolean;
  /** Node carries slash-command options. */
  hasCommandOptions?: boolean;
  defaults?: Record<string, ConfigValue>;
}

export type MessageType = "embed" | "components";

export type ConfigValue = string | number | boolean;

export interface FlowNodeData extends Record<string, unknown> {
  type: string;
  title: string;
  enabled: boolean;
  config: Record<string, ConfigValue>;
  /** Which message format this node builds: a classic embed or a Components V2 message. */
  messageType?: MessageType;
  embed?: Embed;
  components?: BotComponent[];
  options?: CommandOption[];
}

export interface FlowNode {
  id: string;
  type: "bottly";
  position: { x: number; y: number };
  data: FlowNodeData;
  selected?: boolean;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface Flow {
  id: string;
  name: string;
  description: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdAt: string;
  updatedAt: string;
}

export interface FlowSnapshot {
  nodes: FlowNode[];
  edges: FlowEdge[];
}
