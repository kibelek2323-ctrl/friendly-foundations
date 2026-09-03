import { uid } from "@/lib/id";
import { buttonComponent, createFlowNode, embedWith } from "@/data/flow-factories";
import type { ConfigValue, FlowEdge, FlowNode, FlowNodeData } from "@/types/flow";
import type { BotComponent, Embed } from "@/types/bot";

export type ExampleCategory =
  | "Moderation"
  | "Tickets"
  | "Verification"
  | "Welcome"
  | "Utility"
  | "Logging"
  | "Giveaways";

interface NodeSpec {
  key: string;
  type: string;
  x: number;
  y: number;
  title?: string;
  config?: Record<string, ConfigValue>;
  embed?: Embed;
  components?: BotComponent[];
  options?: FlowNodeData["options"];
}

interface EdgeSpec {
  from: string;
  to: string;
  handle?: string;
}

export interface FlowExample {
  id: string;
  category: ExampleCategory;
  title: string;
  command: string;
  steps: string[];
  nodes: NodeSpec[];
  edges: EdgeSpec[];
}

function opts(list: { name: string; description: string; type: FlowNodeData["options"] extends undefined ? never : string; required?: boolean }[]) {
  return list.map((o) => ({
    id: uid("opt"),
    name: o.name,
    description: o.description,
    type: o.type as never,
    required: o.required ?? false,
    autocomplete: false,
  }));
}

export const FLOW_EXAMPLES: FlowExample[] = [
  {
    id: "ban-command",
    category: "Moderation",
    title: "Ban Command",
    command: "/ban",
    steps: ["Check permissions", "Ban user", "Send confirmation embed", "Error branch"],
    nodes: [
      {
        key: "cmd",
        type: "slash-command",
        x: 0,
        y: 0,
        title: "/ban",
        config: { name: "ban", description: "Ban a member from the server." },
        options: opts([
          { name: "user", description: "Member to ban", type: "user", required: true },
          { name: "reason", description: "Reason for the ban", type: "string" },
        ]),
      },
      { key: "perm", type: "check-permission", x: 0, y: 190, config: { permission: "BanMembers", user: "{user}" } },
      { key: "ban", type: "ban-user", x: -190, y: 400, config: { user: "{user}", reason: "{reason}" } },
      {
        key: "ok",
        type: "send-embed",
        x: -190, y: 600,
        embed: embedWith({
          title: "🔨 User banned",
          description: "{user} has been banned.\n**Reason:** {reason}",
          color: "#ED4245",
          footer: { text: "Bottly moderation", icon: "" },
        }),
        components: [buttonComponent("Appeal", "secondary")],
      },
      {
        key: "err",
        type: "send-embed",
        x: 260, y: 400,
        title: "Send Error Embed",
        config: { ephemeral: true },
        embed: embedWith({
          title: "Missing permission",
          description: "You need the **Ban Members** permission to use this command.",
          color: "#F0B232",
          footer: { text: "", icon: "" },
          timestamp: false,
        }),
      },
    ],
    edges: [
      { from: "cmd", to: "perm" },
      { from: "perm", to: "ban", handle: "true" },
      { from: "perm", to: "err", handle: "false" },
      { from: "ban", to: "ok" },
    ],
  },
  {
    id: "ticket-system",
    category: "Tickets",
    title: "Ticket System",
    command: "/ticket",
    steps: ["Send ticket embed", "Create ticket button", "Create channel", "Send welcome message"],
    nodes: [
      {
        key: "cmd",
        type: "slash-command",
        x: 0,
        y: 0,
        title: "/ticket",
        config: { name: "ticket", description: "Open the ticket panel." },
      },
      {
        key: "panel",
        type: "send-embed",
        x: 0, y: 190,
        embed: embedWith({
          title: "🎫 Create a ticket",
          description: "Need help? Click the button below and our team will be with you shortly.",
          color: "#5865F2",
          footer: { text: "Support team", icon: "" },
        }),
        components: [buttonComponent("🎫 Create Ticket", "primary")],
      },
      { key: "click", type: "button-click", x: 0, y: 400, config: { customId: "create_ticket" } },
      {
        key: "channel",
        type: "send-message",
        x: 0, y: 590,
        title: "Create Ticket Channel",
        config: { channel: "ticket-{username}", content: "Ticket channel created." },
      },
      {
        key: "welcome",
        type: "send-embed",
        x: 0, y: 790,
        title: "Send Welcome Embed",
        embed: embedWith({
          title: "Ticket opened",
          description: "Hey {user}, describe your issue and a moderator will reply soon.",
          color: "#23A55A",
          footer: { text: "", icon: "" },
        }),
        components: [buttonComponent("Close ticket", "danger")],
      },
    ],
    edges: [
      { from: "cmd", to: "panel" },
      { from: "panel", to: "click" },
      { from: "click", to: "channel" },
      { from: "channel", to: "welcome" },
    ],
  },
  {
    id: "verification",
    category: "Verification",
    title: "Verification System",
    command: "/verify",
    steps: ["Send verification embed", "Verification button", "Add role", "Send success message"],
    nodes: [
      {
        key: "cmd",
        type: "slash-command",
        x: 0,
        y: 0,
        title: "/verify",
        config: { name: "verify", description: "Post the verification panel." },
      },
      {
        key: "panel",
        type: "send-embed",
        x: 0, y: 190,
        embed: embedWith({
          title: "✅ Verify yourself",
          description: "Click **Verify** to gain access to {server.name}.",
          color: "#23A55A",
          footer: { text: "", icon: "" },
        }),
        components: [buttonComponent("Verify", "success")],
      },
      { key: "click", type: "button-click", x: 0, y: 400, config: { customId: "verify" } },
      { key: "role", type: "add-role", x: 0, y: 580, config: { user: "{user}", role: "@Verified" } },
      {
        key: "done",
        type: "send-embed",
        x: 0, y: 760,
        title: "Send Success Message",
        config: { ephemeral: true },
        embed: embedWith({
          title: "You're verified!",
          description: "Welcome to {server.name}, {username}.",
          color: "#5865F2",
          footer: { text: "", icon: "" },
          timestamp: false,
        }),
      },
    ],
    edges: [
      { from: "cmd", to: "panel" },
      { from: "panel", to: "click" },
      { from: "click", to: "role" },
      { from: "role", to: "done" },
    ],
  },
  {
    id: "welcome-flow",
    category: "Welcome",
    title: "Welcome Greeter",
    command: "Member Joined",
    steps: ["Member joins", "Send welcome embed", "Add default role"],
    nodes: [
      { key: "join", type: "member-joined", x: 0, y: 0 },
      {
        key: "embed",
        type: "send-embed",
        x: 0, y: 190,
        config: { channel: "#welcome" },
        embed: embedWith({
          title: "👋 Welcome {username}!",
          description: "You are member #{server.memberCount} of {server.name}. Enjoy your stay!",
          color: "#7C5CFC",
          footer: { text: "", icon: "" },
        }),
      },
      { key: "role", type: "add-role", x: 0, y: 400, config: { user: "{user}", role: "@Member" } },
    ],
    edges: [
      { from: "join", to: "embed" },
      { from: "embed", to: "role" },
    ],
  },
  {
    id: "poll-utility",
    category: "Utility",
    title: "Quick Poll",
    command: "/poll",
    steps: ["Slash command", "Send embed with dropdown", "Store the vote"],
    nodes: [
      {
        key: "cmd",
        type: "slash-command",
        x: 0,
        y: 0,
        title: "/poll",
        config: { name: "poll", description: "Start a quick poll." },
        options: opts([{ name: "question", description: "Poll question", type: "string", required: true }]),
      },
      {
        key: "embed",
        type: "send-embed",
        x: 0, y: 190,
        embed: embedWith({
          title: "📊 Poll",
          description: "{question}",
          color: "#F0B232",
          footer: { text: "Vote below", icon: "" },
        }),
        components: [buttonComponent("Yes", "success"), buttonComponent("No", "danger")],
      },
      { key: "select", type: "dropdown-select", x: 0, y: 420, config: { customId: "poll_vote" } },
      { key: "inc", type: "increment", x: 0, y: 600, config: { name: "votes", amount: 1 } },
    ],
    edges: [
      { from: "cmd", to: "embed" },
      { from: "embed", to: "select" },
      { from: "select", to: "inc" },
    ],
  },
  {
    id: "mod-logging",
    category: "Logging",
    title: "Message Delete Log",
    command: "Message Received",
    steps: ["Watch messages", "Filter", "Log to channel"],
    nodes: [
      { key: "msg", type: "message-received", x: 0, y: 0 },
      { key: "check", type: "contains", x: 0, y: 190, config: { text: "{message.content}", value: "discord.gg/" } },
      {
        key: "delete",
        type: "delete-messages",
        x: -190, y: 400,
        config: { amount: 1, channel: "{channel}" },
      },
      {
        key: "log",
        type: "send-embed",
        x: -190, y: 590,
        title: "Log Entry",
        config: { channel: "#mod-logs" },
        embed: embedWith({
          title: "🚫 Invite link removed",
          description: "Message from {user} in {channel} was deleted.",
          color: "#ED4245",
          footer: { text: "", icon: "" },
        }),
      },
    ],
    edges: [
      { from: "msg", to: "check" },
      { from: "check", to: "delete", handle: "true" },
      { from: "delete", to: "log" },
    ],
  },
  {
    id: "giveaway",
    category: "Giveaways",
    title: "Giveaway Launcher",
    command: "/giveaway",
    steps: ["Slash command", "Send giveaway embed", "Enter button", "Store entry"],
    nodes: [
      {
        key: "cmd",
        type: "slash-command",
        x: 0,
        y: 0,
        title: "/giveaway",
        config: { name: "giveaway", description: "Start a giveaway." },
        options: opts([{ name: "prize", description: "What to give away", type: "string", required: true }]),
      },
      {
        key: "embed",
        type: "send-embed",
        x: 0, y: 190,
        embed: embedWith({
          title: "🎉 Giveaway!",
          description: "Prize: **{prize}**\nClick **Enter** to join.",
          color: "#7C5CFC",
          footer: { text: "Ends soon", icon: "" },
        }),
        components: [buttonComponent("🎉 Enter", "primary")],
      },
      { key: "click", type: "button-click", x: 0, y: 420, config: { customId: "giveaway_enter" } },
      { key: "cooldown", type: "cooldown", x: 0, y: 600, config: { seconds: 60, scope: "user" } },
      { key: "store", type: "set-variable", x: 0, y: 790, config: { name: "entries", value: "{user.id}" } },
    ],
    edges: [
      { from: "cmd", to: "embed" },
      { from: "embed", to: "click" },
      { from: "click", to: "cooldown" },
      { from: "cooldown", to: "store" },
    ],
  },
];

export function instantiateExample(
  example: FlowExample,
  offset: { x: number; y: number } = { x: 0, y: 0 },
): { nodes: FlowNode[]; edges: FlowEdge[]; triggerId: string } {
  const map = new Map<string, FlowNode>();
  const nodes = example.nodes.map((spec) => {
    const overrides: Partial<FlowNodeData> = {};
    if (spec.title) overrides.title = spec.title;
    if (spec.config) overrides.config = spec.config;
    if (spec.embed) overrides.embed = spec.embed;
    if (spec.components) overrides.components = spec.components;
    if (spec.options) overrides.options = spec.options;
    const node = createFlowNode(spec.type, { x: spec.x + offset.x, y: spec.y + offset.y }, overrides);
    map.set(spec.key, node);
    return node;
  });
  const edges: FlowEdge[] = example.edges.flatMap((e) => {
    const source = map.get(e.from);
    const target = map.get(e.to);
    if (!source || !target) return [];
    return [
      {
        id: uid("edge"),
        source: source.id,
        target: target.id,
        sourceHandle: e.handle ?? "out",
        targetHandle: "in",
      },
    ];
  });
  return { nodes, edges, triggerId: nodes[0]?.id ?? "" };
}
