import { uid } from "@/lib/id";
import type {
  Automation,
  Bot,
  BotComponent,
  BotDesign,
  BotEvent,
  Command,
  CommandOption,
  CommandOptionType,
  ComponentType,
  Embed,
  EmbedField,
  WizardDraft,
} from "@/types/bot";

export function createEmbedField(): EmbedField {
  return { id: uid("fld"), name: "Field name", value: "Field value", inline: false };
}

export function createEmbed(partial: Partial<Embed> = {}): Embed {
  return {
    id: uid("emb"),
    author: { name: "", icon: "", url: "" },
    title: "Welcome to the server",
    description: "Read the rules, grab your roles and say hi in #general.",
    url: "",
    color: "#5865F2",
    thumbnail: "",
    image: "",
    fields: [],
    footer: { text: "Powered by Bottly", icon: "" },
    timestamp: true,
    ...partial,
  };
}

export function createComponent(type: ComponentType = "button"): BotComponent {
  const labels: Partial<Record<ComponentType, string>> = {
    button: "Click me",
    "link-button": "Open link",
    "string-select": "Choose an option",
    "user-select": "Select a member",
    "role-select": "Select a role",
    "mentionable-select": "Select a mention",
    "channel-select": "Select a channel",
    modal: "Open form",
    "text-input": "Your answer",
    container: "Container",
    "action-row": "Action row",
    separator: "Separator",
    "text-display": "Text display",
    section: "Section",
    "media-gallery": "Media gallery",
    file: "File",
  };
  return {
    id: uid("cmp"),
    type,
    label: labels[type] ?? "Component",
    style: type === "link-button" ? "link" : "primary",
    emoji: "",
    action: type === "link-button" ? "" : "open_ticket",
    url: type === "link-button" ? "https://bottly.app" : "",
    disabled: false,
    placeholder: labels[type] ?? "Make a selection",
    options:
      type === "string-select"
        ? [
            { id: uid("opt"), label: "Support", description: "Get help from the team", value: "support" },
            { id: uid("opt"), label: "Bug report", description: "Something is broken", value: "bug" },
          ]
        : [],
    ...(type === "text-display" || type === "section"
      ? { content: type === "section" ? "**Section title**\nSome supporting text." : "Write **markdown** here." }
      : {}),
    ...(type === "section" ? { accessoryKind: "thumbnail" as const, accessoryUrl: "" } : {}),
    ...(type === "media-gallery"
      ? { items: [{ id: uid("media"), url: "", description: "", spoiler: false }] }
      : {}),
    ...(type === "file" ? { items: [{ id: uid("file"), url: "", description: "report.pdf", spoiler: false }] } : {}),
    ...(type === "separator" ? { divider: true, spacing: "small" as const } : {}),
    ...(type === "container" ? { accentColor: "#5865F2", spoiler: false, children: [] } : {}),
    ...(type === "action-row" ? { children: [] } : {}),
  };
}

export function createCommandOption(type: CommandOptionType = "string"): CommandOption {
  return {
    id: uid("opt"),
    name: "option",
    description: "Describe this option",
    type,
    required: false,
    autocomplete: false,
  };
}

export function createCommand(partial: Partial<Command> = {}): Command {
  return {
    id: uid("cmd"),
    name: "new-command",
    description: "Describe what this command does",
    options: [],
    permissions: [],
    response: {
      type: "text",
      text: "Hello from Bottly!",
      embed: null,
      ephemeral: false,
      allowedMentions: [],
    },
    enabled: true,
    ...partial,
  };
}

export function createAutomation(partial: Partial<Automation> = {}): Automation {
  const triggerId = uid("nd");
  const conditionId = uid("nd");
  const actionId = uid("nd");
  return {
    id: uid("auto"),
    name: "New automation",
    description: "Describe what this workflow does",
    enabled: true,
    nodes: [
      { id: triggerId, kind: "trigger", type: "member-join", label: "Member Join", config: {}, position: { x: 40, y: 40 } },
      { id: conditionId, kind: "condition", type: "account-age", label: "Account age", config: { value: "7 days" }, position: { x: 40, y: 200 } },
      { id: actionId, kind: "action", type: "send-embed", label: "Send embed", config: { channel: "#welcome" }, position: { x: 40, y: 360 } },
    ],
    edges: [
      { id: uid("edg"), source: triggerId, target: conditionId },
      { id: uid("edg"), source: conditionId, target: actionId },
    ],
    ...partial,
  };
}

export function defaultEvents(): BotEvent[] {
  const base = [
    { name: "onReady", description: "Fires once the gateway connection is established.", enabled: true, actions: ["Log event", "Set presence"], channel: "#bot-logs", message: "Bottly is online and ready." },
    { name: "onMemberJoin", description: "Fires when a new member joins a server.", enabled: true, actions: ["Send welcome embed", "Add role"], channel: "#welcome", message: "Welcome {user} to {server}! 👋" },
    { name: "onMemberLeave", description: "Fires when a member leaves or is removed.", enabled: true, actions: ["Log event"], channel: "#bot-logs", message: "{user} just left the server." },
    { name: "onMessageCreate", description: "Fires for every message the bot can see.", enabled: false, actions: ["Scan for filtered words"], channel: "#mod-log", message: "Filtered message removed from {channel}." },
    { name: "onInteractionCreate", description: "Fires for slash commands, buttons and selects.", enabled: true, actions: ["Route to command handler"], channel: "#bot-logs", message: "{user} used {command}." },
    { name: "onGuildCreate", description: "Fires when the bot is added to a new server.", enabled: true, actions: ["Register commands", "Log event"], channel: "#bot-logs", message: "Joined {server} — commands registered." },
  ];
  return base.map((e) => ({ ...e, id: uid("evt") }));
}

export function defaultDesign(name = "Bottly Helper"): BotDesign {
  return {
    theme: "discord-dark",
    accentColor: "#5865F2",
    embedColor: "#5865F2",
    font: "Inter",
    borderRadius: 8,
    botName: name,
    botAvatar: "",
    messageStyle: "cozy",
    messageContent: "Welcome aboard! Here is everything you need to get started.",
    embeds: [createEmbed()],
  };
}

export function emptyDraft(): WizardDraft {
  return {
    step: 0,
    plan: "pro",
    name: "",
    username: "",
    description: "",
    avatar: "",
    language: "javascript",
    timezone: "UTC",
    features: ["moderation", "welcome"],
    design: defaultDesign("New Bot"),
    commands: [],
    components: [],
    automations: [],
  };
}

export function draftToBot(draft: WizardDraft): Bot {
  const now = new Date().toISOString();
  return {
    id: uid("bot"),
    name: draft.name.trim() || "Untitled Bot",
    username: draft.username.trim() || "untitled-bot",
    description: draft.description,
    avatar: draft.avatar,
    status: "offline",
    plan: draft.plan,
    language: draft.language,
    timezone: draft.timezone,
    servers: 0,
    members: 0,
    uptime: "0%",
    features: draft.features,
    design: { ...draft.design, botName: draft.name.trim() || draft.design.botName, botAvatar: draft.avatar },
    commands: draft.commands,
    components: draft.components,
    automations: draft.automations,
    events: defaultEvents(),
    logs: [
      {
        id: uid("log"),
        timestamp: now,
        event: "Bot created",
        level: "success",
        description: `${draft.name || "Untitled Bot"} was created with the ${draft.plan} plan.`,
      },
    ],
    applicationId: null,
    createdAt: now,
    updatedAt: now,
  };
}
