export type PlanId = "free" | "pro" | "ultimate";
export type BotStatus = "online" | "offline" | "draft";
export type BotLanguage = "javascript" | "python";

export interface EmbedField {
  id: string;
  name: string;
  value: string;
  inline: boolean;
}

export interface Embed {
  id: string;
  author: { name: string; icon: string; url: string };
  title: string;
  description: string;
  url: string;
  color: string;
  thumbnail: string;
  image: string;
  fields: EmbedField[];
  footer: { text: string; icon: string };
  timestamp: boolean;
}

export type ComponentType =
  | "button"
  | "link-button"
  | "string-select"
  | "user-select"
  | "role-select"
  | "mentionable-select"
  | "channel-select"
  | "modal"
  | "text-input"
  | "action-row"
  | "container"
  | "separator"
  | "text-display"
  | "section"
  | "media-gallery"
  | "file";

export type ButtonStyle = "primary" | "secondary" | "success" | "danger" | "link";

export interface SelectOption {
  id: string;
  label: string;
  description: string;
  value: string;
}

export interface MediaItem {
  id: string;
  url: string;
  description: string;
  spoiler: boolean;
}

export type SeparatorSpacing = "small" | "large";

export interface BotComponent {
  id: string;
  type: ComponentType;
  label: string;
  style: ButtonStyle;
  emoji: string;
  action: string;
  url: string;
  disabled: boolean;
  placeholder: string;
  options: SelectOption[];
  /** Components V2 — markdown body for Text Display / Section text. */
  content?: string;
  /** Components V2 — Media Gallery items and File attachments. */
  items?: MediaItem[];
  /** Components V2 — Separator: show the divider line and its spacing. */
  divider?: boolean;
  spacing?: SeparatorSpacing;
  /** Components V2 — Container accent bar color and spoiler blur. */
  accentColor?: string;
  spoiler?: boolean;
  /** Components V2 — nested children (Container). */
  children?: BotComponent[];
  /** Components V2 — Section accessory: a thumbnail or a button. */
  accessory?: BotComponent | null;
  /** Section accessory thumbnail URL when accessory is an image. */
  accessoryUrl?: string;
  accessoryKind?: "thumbnail" | "button";
}

export type CommandOptionType =
  | "string"
  | "integer"
  | "number"
  | "boolean"
  | "user"
  | "role"
  | "channel"
  | "mentionable"
  | "attachment";

export interface CommandOption {
  id: string;
  name: string;
  description: string;
  type: CommandOptionType;
  required: boolean;
  autocomplete: boolean;
}

export type CommandResponseType = "text" | "embed" | "components" | "modal";

export interface Command {
  id: string;
  name: string;
  description: string;
  options: CommandOption[];
  permissions: string[];
  response: {
    type: CommandResponseType;
    text: string;
    embed: Embed | null;
    ephemeral: boolean;
    allowedMentions: string[];
  };
  enabled: boolean;
  /** Visual flow that implements this command. */
  flowId?: string | null;
}

export type AutomationNodeKind = "trigger" | "condition" | "action";

export interface AutomationNode {
  id: string;
  kind: AutomationNodeKind;
  type: string;
  label: string;
  config: Record<string, string>;
  position: { x: number; y: number };
}

export interface AutomationEdge {
  id: string;
  source: string;
  target: string;
}

export interface Automation {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  nodes: AutomationNode[];
  edges: AutomationEdge[];
}

export interface BotEvent {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  actions: string[];
  channel: string;
  message: string;
}

export type LogLevel = "info" | "success" | "warning" | "error";

export interface LogEntry {
  id: string;
  timestamp: string;
  event: string;
  level: LogLevel;
  description: string;
}

export type ThemePreset = "discord-dark" | "midnight" | "purple" | "minimal" | "custom";
export type MessageStyle = "compact" | "cozy";

export interface BotDesign {
  theme: ThemePreset;
  accentColor: string;
  embedColor: string;
  font: string;
  borderRadius: number;
  botName: string;
  botAvatar: string;
  messageStyle: MessageStyle;
  messageContent: string;
  embeds: Embed[];
}

export type PresenceStatus = "online" | "idle" | "dnd" | "invisible";
export type ActivityType = "playing" | "streaming" | "listening" | "watching" | "competing" | "custom";

export interface BotPresence {
  status: PresenceStatus;
  activityType: ActivityType;
  activityName: string;
  activityState: string;
  streamUrl: string;
  aboutMe: string;
}

export const DEFAULT_PRESENCE: BotPresence = {
  status: "online",
  activityType: "playing",
  activityName: "/help • built with Bottly",
  activityState: "",
  streamUrl: "",
  aboutMe: "",
};

export interface Bot {
  id: string;
  name: string;
  username: string;
  description: string;
  avatar: string;
  status: BotStatus;
  plan: PlanId;
  language: BotLanguage;
  timezone: string;
  servers: number;
  members: number;
  uptime: string;
  features: string[];
  design: BotDesign;
  presence?: BotPresence;
  commands: Command[];
  components: BotComponent[];
  automations: Automation[];
  events: BotEvent[];
  logs: LogEntry[];
  /**
   * Discord application (client) id, resolved server-side when a token is saved.
   * Public information. The token itself is NEVER part of this object — it lives
   * encrypted in public.bot_tokens and is readable only by service-role code.
   */
  applicationId?: string | null;
  /** Bought from the marketplace — only appearance/presence may be edited. */
  purchased?: boolean;
  /** Marketplace listing this bot was bought from. */
  listingId?: string | null;
  /** Visual flow builder workspace attached to this bot. */
  flowId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WizardDraft {
  step: number;
  plan: PlanId;
  name: string;
  username: string;
  description: string;
  avatar: string;
  language: BotLanguage;
  timezone: string;
  features: string[];
  design: BotDesign;
  commands: Command[];
  components: BotComponent[];
  automations: Automation[];
}
