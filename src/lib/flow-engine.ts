import type { Embed, BotComponent } from "@/types/bot";
import type { Flow, FlowEdge, FlowNode } from "@/types/flow";

export interface SimulationContext {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    roles: string[];
    permissions: string[];
  };
  server: { id: string; name: string; memberCount: number };
  channel: { id: string; name: string };
}

export interface RunRequest {
  trigger:
    | "slash-command"
    | "message"
    | "member-join"
    | "member-leave"
    | "reaction-add"
    | "reaction-remove"
    | "button"
    | "dropdown"
    | "modal"
    | "scheduled"
    | "ready";
  command?: string;
  args?: string[];
  message?: string;
  customId?: string;
  values?: string[];
  emoji?: string;
  context: SimulationContext;
}

export interface SimulationMessage {
  content: string;
  embeds: Embed[];
  components: BotComponent[];
  ephemeral?: boolean;
  dm?: boolean;
  channel?: string;
}

export interface RunStep {
  nodeId: string;
  nodeTitle: string;
  nodeType: string;
  description: string;
  branch?: string | undefined;
}

export interface RunResult {
  matched: boolean;
  steps: RunStep[];
  messages: SimulationMessage[];
  variables: Record<string, string>;
  logs: string[];
  durationMs: number;
}

const DEFAULT_CONTEXT: SimulationContext = {
  user: {
    id: "123456789012345678",
    username: "testuser",
    displayName: "Test User",
    roles: ["@Member"],
    permissions: ["SendMessages"],
  },
  server: { id: "987654321098765432", name: "Test Server", memberCount: 42 },
  channel: { id: "111111111111111111", name: "general" },
};

export function defaultSimulationContext(): SimulationContext {
  return structuredClone(DEFAULT_CONTEXT);
}

function buildBaseVariables(request: RunRequest): Record<string, string> {
  const ctx = request.context;
  const args = request.args ?? [];
  return {
    user: `<@${ctx.user.id}>`,
    "user.id": ctx.user.id,
    username: ctx.user.username,
    "user.displayName": ctx.user.displayName,
    "user.avatar": ctx.user.avatar ?? "",
    server: ctx.server.name,
    "server.name": ctx.server.name,
    "server.memberCount": String(ctx.server.memberCount),
    "server.id": ctx.server.id,
    channel: `<#${ctx.channel.id}>`,
    "channel.name": ctx.channel.name,
    "channel.id": ctx.channel.id,
    command: request.command ?? "",
    args: args.join(" "),
    reason: "No reason provided",
    timestamp: new Date().toISOString(),
    "message.content": request.message ?? "",
    "message.id": "000000000000000000",
    "interaction.customId": request.customId ?? "",
    "interaction.values": (request.values ?? []).join(", "),
    "reaction.emoji": request.emoji ?? "",
  };
}

export function substituteVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{([^}]+)\}/g, (_: string, key: string) => {
    const trimmed = key.trim();
    if (trimmed in vars) return vars[trimmed] ?? `{${trimmed}}`;
    return `{${trimmed}}`;
  });
}

function getConfig(node: FlowNode, key: string, fallback = ""): string {
  const value = node.data.config[key];
  return value == null ? fallback : String(value);
}

function getNumber(node: FlowNode, key: string, fallback = 0): number {
  const value = node.data.config[key];
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function nodeMatchesTrigger(node: FlowNode, request: RunRequest): boolean {
  const type = node.data.type;
  const config = node.data.config;

  switch (request.trigger) {
    case "slash-command":
      return type === "slash-command" && String(config["name"] ?? "").toLowerCase() === (request.command ?? "").toLowerCase();
    case "message":
      if (type !== "message-received") return false;
      const filter = String(config["channel"] ?? "").trim();
      if (!filter) return true;
      return request.context.channel.name.toLowerCase() === filter.replace(/^#/, "").toLowerCase();
    case "member-join":
      return type === "member-joined";
    case "member-leave":
      return type === "member-left";
    case "reaction-add":
      return type === "reaction-added" && (!config["emoji"] || String(config["emoji"]) === request.emoji);
    case "reaction-remove":
      return type === "reaction-removed" && (!config["emoji"] || String(config["emoji"]) === request.emoji);
    case "button":
      return type === "button-click" && String(config["customId"] ?? "") === (request.customId ?? "");
    case "dropdown":
      return type === "dropdown-select" && String(config["customId"] ?? "") === (request.customId ?? "");
    case "modal":
      return type === "modal-submit" && String(config["customId"] ?? "") === (request.customId ?? "");
    case "scheduled":
      return type === "scheduled-event";
    case "ready":
      return type === "bot-ready";
    default:
      return false;
  }
}

function evaluateCondition(node: FlowNode, vars: Record<string, string>, ctx: SimulationContext): string {
  const type = node.data.type;
  const config = node.data.config;

  switch (type) {
    case "if-else": {
      const variable = substituteVars(String(config["variable"] ?? ""), vars);
      const value = substituteVars(String(config["value"] ?? ""), vars);
      const operator = String(config["operator"] ?? "equals");
      return testComparison(variable, operator, value, ctx.user.roles) ? "true" : "false";
    }
    case "check-permission": {
      const permission = String(config["permission"] ?? "");
      return ctx.user.permissions.includes(permission) || ctx.user.permissions.includes("Administrator")
        ? "true"
        : "false";
    }
    case "check-role": {
      const role = substituteVars(String(config["role"] ?? ""), vars).replace(/^@/, "");
      return ctx.user.roles.some((r) => r.replace(/^@/, "") === role) ? "true" : "false";
    }
    case "check-channel": {
      const channel = substituteVars(String(config["channel"] ?? ""), vars).replace(/^#/, "");
      return ctx.channel.name.toLowerCase() === channel.toLowerCase() ? "true" : "false";
    }
    case "compare": {
      const left = Number(substituteVars(String(config["left"] ?? ""), vars));
      const right = Number(substituteVars(String(config["right"] ?? ""), vars));
      const op = String(config["operator"] ?? "gt");
      if (Number.isNaN(left) || Number.isNaN(right)) return "false";
      switch (op) {
        case "gt":
          return left > right ? "true" : "false";
        case "gte":
          return left >= right ? "true" : "false";
        case "lt":
          return left < right ? "true" : "false";
        case "lte":
          return left <= right ? "true" : "false";
        default:
          return "false";
      }
    }
    case "contains": {
      const text = substituteVars(String(config["text"] ?? ""), vars);
      const value = substituteVars(String(config["value"] ?? ""), vars);
      return text.toLowerCase().includes(value.toLowerCase()) ? "true" : "false";
    }
    case "equals": {
      const left = substituteVars(String(config["left"] ?? ""), vars);
      const right = substituteVars(String(config["right"] ?? ""), vars);
      return left === right ? "true" : "false";
    }
    case "random": {
      const chance = getNumber(node, "chance", 50);
      return Math.random() * 100 < chance ? "a" : "b";
    }
    default:
      return "out";
  }
}

function testComparison(left: string, operator: string, value: string, userRoles: string[]): boolean {
  switch (operator) {
    case "equals":
      return left === value;
    case "not-equals":
      return left !== value;
    case "contains":
      return left.toLowerCase().includes(value.toLowerCase());
    case "not-contains":
      return !left.toLowerCase().includes(value.toLowerCase());
    case "gt":
      return Number(left) > Number(value);
    case "lt":
      return Number(left) < Number(value);
    case "has-role":
      return userRoles.some((r) => r.replace(/^@/, "") === value.replace(/^@/, ""));
    case "not-has-role":
      return !userRoles.some((r) => r.replace(/^@/, "") === value.replace(/^@/, ""));
    default:
      return false;
  }
}

function isCondition(type: string): boolean {
  return [
    "if-else",
    "check-permission",
    "check-role",
    "check-channel",
    "compare",
    "contains",
    "equals",
    "random",
    "cooldown",
  ].includes(type);
}

function isMessageProducer(type: string): boolean {
  return ["send-message", "send-embed", "reply", "send-dm"].includes(type);
}

function isComponent(type: string): boolean {
  return [
    "component-button",
    "component-dropdown",
    "component-string-select",
    "component-user-select",
    "component-role-select",
    "component-channel-select",
    "component-mentionable-select",
    "component-modal",
    "component-text-input",
  ].includes(type);
}

export function runFlow(flow: Flow, request: RunRequest): RunResult {
  const started = performance.now();
  const steps: RunStep[] = [];
  const messages: SimulationMessage[] = [];
  const logs: string[] = [];
  const vars: Record<string, string> = { ...buildBaseVariables(request) };
  let currentMessage: SimulationMessage | null = null;

  const nodeMap = new Map(flow.nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, FlowEdge[]>();
  for (const edge of flow.edges) {
    const list = outgoing.get(edge.source) ?? [];
    list.push(edge);
    outgoing.set(edge.source, list);
  }

  const triggers = flow.nodes.filter((n) => nodeMatchesTrigger(n, request));
  if (triggers.length === 0) {
    return {
      matched: false,
      steps: [],
      messages: [],
      variables: vars,
      logs: ["No matching trigger node found."],
      durationMs: Math.round(performance.now() - started),
    };
  }

  const visited = new Set<string>();
  const queue: { nodeId: string; branch?: string | undefined }[] = triggers.map((t) => ({ nodeId: t.id }));

  function pushStep(node: FlowNode, description: string, branch?: string) {
    steps.push({
      nodeId: node.id,
      nodeTitle: node.data.title,
      nodeType: node.data.type,
      description,
      branch,
    });
  }

  function lastMessage(): SimulationMessage {
    if (!currentMessage) {
      currentMessage = { content: "", embeds: [], components: [] };
      messages.push(currentMessage);
    }
    return currentMessage;
  }

  while (queue.length > 0) {
    const { nodeId, branch } = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) continue;

    const type = node.data.type;
    const config = node.data.config;

    if (type === "slash-command") {
      pushStep(node, `Triggered by /${getConfig(node, "name")}`);
    } else if (type === "message-received") {
      pushStep(node, `Message received in #${request.context.channel.name}`);
    } else if (type === "member-joined") {
      pushStep(node, `New member joined ${request.context.server.name}`);
    } else if (type === "member-left") {
      pushStep(node, `Member left ${request.context.server.name}`);
    } else if (type === "reaction-added") {
      pushStep(node, `Reaction ${request.emoji ?? ""} added`);
    } else if (type === "reaction-removed") {
      pushStep(node, `Reaction ${request.emoji ?? ""} removed`);
    } else if (type === "button-click") {
      pushStep(node, `Button \`${getConfig(node, "customId")}\` clicked`);
    } else if (type === "dropdown-select") {
      pushStep(node, `Dropdown \`${getConfig(node, "customId")}\` selected`);
    } else if (type === "modal-submit") {
      pushStep(node, `Modal \`${getConfig(node, "customId")}\` submitted`);
    } else if (type === "scheduled-event") {
      pushStep(node, `Scheduled cron \`${getConfig(node, "cron")}\` fired`);
    } else if (type === "bot-ready") {
      pushStep(node, "Bot connected to Discord");
    } else if (isCondition(type)) {
      const result = evaluateCondition(node, vars, request.context);
      pushStep(node, `Condition evaluated to ${result}`, result);
      const nextEdges = outgoing.get(nodeId) ?? [];
      for (const edge of nextEdges) {
        if (edge.sourceHandle === result || (!edge.sourceHandle && result === "true")) {
          queue.push({ nodeId: edge.target, branch: result });
        }
      }
      continue;
    } else if (isMessageProducer(type)) {
      const content = substituteVars(getConfig(node, "content"), vars);
      const channel = substituteVars(getConfig(node, "channel"), vars);
      const ephemeral = Boolean(config["ephemeral"]);
      const embed = node.data.embed ? { ...node.data.embed } : undefined;
      const msg: SimulationMessage = {
        content,
        embeds: embed ? [embed] : [],
        components: [],
        ephemeral,
        dm: type === "send-dm",
        channel,
      };
      messages.push(msg);
      currentMessage = msg;
      pushStep(node, `${type === "reply" ? "Replied" : type === "send-dm" ? "Sent DM" : "Sent message"}${channel ? ` to ${channel}` : ""}`);
    } else if (isComponent(type)) {
      const msg = lastMessage();
      const comps = node.data.components ?? [];
      msg.components.push(...comps.map((c) => ({ ...c })));
      pushStep(node, `Attached ${type.replace("component-", "")} component(s)`);
    } else if (type === "ban-user") {
      const user = substituteVars(getConfig(node, "user"), vars);
      const reason = substituteVars(getConfig(node, "reason"), vars);
      logs.push(`Banned ${user} — ${reason}`);
      pushStep(node, `Banned ${user}`);
    } else if (type === "kick-user") {
      const user = substituteVars(getConfig(node, "user"), vars);
      logs.push(`Kicked ${user}`);
      pushStep(node, `Kicked ${user}`);
    } else if (type === "timeout-user") {
      const user = substituteVars(getConfig(node, "user"), vars);
      const duration = getConfig(node, "duration", "10m");
      logs.push(`Timed out ${user} for ${duration}`);
      pushStep(node, `Timed out ${user} for ${duration}`);
    } else if (type === "warn-user") {
      const user = substituteVars(getConfig(node, "user"), vars);
      const reason = substituteVars(getConfig(node, "reason"), vars);
      logs.push(`Warned ${user} — ${reason}`);
      pushStep(node, `Warned ${user}`);
    } else if (type === "add-role") {
      const user = substituteVars(getConfig(node, "user"), vars);
      const role = substituteVars(getConfig(node, "role"), vars);
      logs.push(`Added role ${role} to ${user}`);
      pushStep(node, `Added role ${role} to ${user}`);
    } else if (type === "remove-role") {
      const user = substituteVars(getConfig(node, "user"), vars);
      const role = substituteVars(getConfig(node, "role"), vars);
      logs.push(`Removed role ${role} from ${user}`);
      pushStep(node, `Removed role ${role} from ${user}`);
    } else if (type === "delete-message") {
      const messageId = substituteVars(getConfig(node, "messageId"), vars);
      logs.push(`Deleted message ${messageId}`);
      pushStep(node, `Deleted message ${messageId}`);
    } else if (type === "delete-messages") {
      const amount = getNumber(node, "amount", 10);
      const channel = substituteVars(getConfig(node, "channel"), vars);
      logs.push(`Deleted ${amount} messages in ${channel}`);
      pushStep(node, `Bulk deleted ${amount} messages`);
    } else if (type === "move-member") {
      const user = substituteVars(getConfig(node, "user"), vars);
      const channel = substituteVars(getConfig(node, "channel"), vars);
      logs.push(`Moved ${user} to ${channel}`);
      pushStep(node, `Moved ${user} to ${channel}`);
    } else if (type === "set-variable") {
      const name = getConfig(node, "name");
      const value = substituteVars(getConfig(node, "value"), vars);
      vars[name] = value;
      pushStep(node, `Set \`${name}\` to "${value}"`);
    } else if (type === "get-variable") {
      const name = getConfig(node, "name");
      pushStep(node, `Read \`${name}\` = "${vars[name] ?? ""}"`);
    } else if (type === "increment") {
      const name = getConfig(node, "name");
      const amount = getNumber(node, "amount", 1);
      vars[name] = String(Number(vars[name] ?? 0) + amount);
      pushStep(node, `Incremented \`${name}\` by ${amount}`);
    } else if (type === "decrement") {
      const name = getConfig(node, "name");
      const amount = getNumber(node, "amount", 1);
      vars[name] = String(Number(vars[name] ?? 0) - amount);
      pushStep(node, `Decremented \`${name}\` by ${amount}`);
    } else if (type === "format-text") {
      const template = substituteVars(getConfig(node, "template"), vars);
      const storeAs = getConfig(node, "storeAs", "text");
      vars[storeAs] = template;
      pushStep(node, `Formatted text into \`${storeAs}\``);
    } else if (["get-user", "get-member", "get-server", "get-channel", "get-role"].includes(type)) {
      const storeAs = getConfig(node, "storeAs", type.replace("get-", ""));
      vars[storeAs] = substituteVars(getConfig(node, type.replace("get-", ""), `{${storeAs}}`), vars);
      pushStep(node, `Fetched Discord object into \`${storeAs}\``);
    } else if (type === "delay") {
      const seconds = getNumber(node, "seconds", 5);
      pushStep(node, `Waited ${seconds}s`);
    } else if (type === "cooldown") {
      const scope = getConfig(node, "scope", "user");
      pushStep(node, `Cooldown checked (${scope})`, "out");
    } else {
      pushStep(node, "Executed");
    }

    const nextEdges = outgoing.get(nodeId) ?? [];
    for (const edge of nextEdges) {
      queue.push({ nodeId: edge.target, branch });
    }
  }

  return {
    matched: true,
    steps,
    messages,
    variables: vars,
    logs,
    durationMs: Math.round(performance.now() - started),
  };
}
