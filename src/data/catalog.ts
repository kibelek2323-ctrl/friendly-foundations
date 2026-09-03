import type {
  AutomationNodeKind,
  ButtonStyle,
  CommandOptionType,
  ComponentType,
  PlanId,
  ThemePreset,
} from "@/types/bot";

export interface PlanDef {
  id: PlanId;
  name: string;
  price: string;
  period: string;
  tagline: string;
  highlight?: boolean;
  limits: { bots: string; commands: string };
  features: string[];
}

export const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    tagline: "Everything you need to ship your first bot.",
    limits: { bots: "1 bot", commands: "5 commands" },
    features: ["1 bot", "5 slash commands", "Basic embeds", "Basic components", "Community support"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$12",
    period: "per month",
    tagline: "For creators running real communities.",
    highlight: true,
    limits: { bots: "5 bots", commands: "50 commands" },
    features: [
      "5 bots",
      "50 slash commands",
      "Advanced embeds",
      "Advanced components",
      "Automations",
      "Custom branding",
    ],
  },
  {
    id: "ultimate",
    name: "Ultimate",
    price: "$29",
    period: "per month",
    tagline: "Unlimited scale for bot studios and networks.",
    limits: { bots: "Unlimited bots", commands: "Unlimited commands" },
    features: [
      "Unlimited bots",
      "Unlimited commands",
      "Advanced automation",
      "Advanced analytics",
      "Priority support",
      "Team seats",
    ],
  },
];

export const PLAN_COMPARISON: { label: string; free: string; pro: string; ultimate: string }[] = [
  { label: "Bots", free: "1", pro: "5", ultimate: "Unlimited" },
  { label: "Slash commands", free: "5", pro: "50", ultimate: "Unlimited" },
  { label: "Embed builder", free: "Basic", pro: "Advanced", ultimate: "Advanced" },
  { label: "Components", free: "Basic", pro: "Advanced", ultimate: "Advanced" },
  { label: "Automations", free: "—", pro: "Included", ultimate: "Advanced" },
  { label: "Custom branding", free: "—", pro: "Included", ultimate: "Included" },
  { label: "Analytics", free: "—", pro: "Basic", ultimate: "Advanced" },
  { label: "Support", free: "Community", pro: "Email", ultimate: "Priority" },
];

export interface FeatureDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const FEATURES: FeatureDef[] = [
  { id: "moderation", name: "Moderation", description: "Ban, kick, warn and timeout with an audit trail.", icon: "ShieldCheck" },
  { id: "tickets", name: "Tickets", description: "Private support threads with transcripts.", icon: "Ticket" },
  { id: "welcome", name: "Welcome System", description: "Greet new members with a custom embed.", icon: "DoorOpen" },
  { id: "autoroles", name: "Auto Roles", description: "Assign roles automatically on join.", icon: "UserCheck" },
  { id: "logging", name: "Logging", description: "Track joins, edits, deletes and role changes.", icon: "ScrollText" },
  { id: "giveaways", name: "Giveaways", description: "Timed giveaways with fair random winners.", icon: "Gift" },
  { id: "verification", name: "Verification", description: "Gate your server behind a verify button.", icon: "BadgeCheck" },
  { id: "suggestions", name: "Suggestions", description: "Collect ideas with upvotes and status.", icon: "Lightbulb" },
  { id: "reactionroles", name: "Reaction Roles", description: "Self-serve roles from buttons or reactions.", icon: "SmilePlus" },
  { id: "economy", name: "Economy", description: "Currency, shop items and daily rewards.", icon: "Coins" },
  { id: "leveling", name: "Leveling", description: "XP, rank cards and level-up rewards.", icon: "TrendingUp" },
  { id: "music", name: "Music", description: "Queue and play audio in voice channels.", icon: "Music" },
  { id: "custom", name: "Custom Commands", description: "Build your own responses without code.", icon: "Terminal" },
];

export const PERMISSIONS = [
  "Administrator",
  "Manage Server",
  "Manage Messages",
  "Kick Members",
  "Ban Members",
  "Manage Channels",
  "Manage Roles",
  "Moderate Members",
  "Custom",
];

export const COMMAND_OPTION_TYPES: { id: CommandOptionType; label: string }[] = [
  { id: "string", label: "String" },
  { id: "integer", label: "Integer" },
  { id: "number", label: "Number" },
  { id: "boolean", label: "Boolean" },
  { id: "user", label: "User" },
  { id: "role", label: "Role" },
  { id: "channel", label: "Channel" },
  { id: "mentionable", label: "Mentionable" },
  { id: "attachment", label: "Attachment" },
];

export const COMPONENT_TYPES: { id: ComponentType; label: string; group: string }[] = [
  { id: "button", label: "Button", group: "Buttons" },
  { id: "link-button", label: "Link button", group: "Buttons" },
  { id: "string-select", label: "String select", group: "Selects" },
  { id: "user-select", label: "User select", group: "Selects" },
  { id: "role-select", label: "Role select", group: "Selects" },
  { id: "mentionable-select", label: "Mentionable select", group: "Selects" },
  { id: "channel-select", label: "Channel select", group: "Selects" },
  { id: "modal", label: "Modal", group: "Layout" },
  { id: "text-input", label: "Text input", group: "Layout" },
  { id: "container", label: "Container", group: "Layout" },
  { id: "action-row", label: "Action row", group: "Layout" },
  { id: "separator", label: "Separator", group: "Layout" },
  { id: "text-display", label: "Text display", group: "Components V2" },
  { id: "section", label: "Section", group: "Components V2" },
  { id: "media-gallery", label: "Media gallery", group: "Components V2" },
  { id: "file", label: "File", group: "Components V2" },
];

export const BUTTON_STYLES: { id: ButtonStyle; label: string }[] = [
  { id: "primary", label: "Primary" },
  { id: "secondary", label: "Secondary" },
  { id: "success", label: "Success" },
  { id: "danger", label: "Danger" },
  { id: "link", label: "Link" },
];

export interface NodeDef {
  type: string;
  label: string;
  kind: AutomationNodeKind;
  description: string;
}

export const TRIGGERS: NodeDef[] = [
  { type: "member-join", label: "Member Join", kind: "trigger", description: "A member joins the server." },
  { type: "member-leave", label: "Member Leave", kind: "trigger", description: "A member leaves the server." },
  { type: "message-create", label: "Message Create", kind: "trigger", description: "A message is sent." },
  { type: "message-delete", label: "Message Delete", kind: "trigger", description: "A message is deleted." },
  { type: "reaction-add", label: "Reaction Add", kind: "trigger", description: "A reaction is added." },
  { type: "reaction-remove", label: "Reaction Remove", kind: "trigger", description: "A reaction is removed." },
  { type: "command-used", label: "Command Used", kind: "trigger", description: "A slash command is invoked." },
  { type: "button-click", label: "Button Click", kind: "trigger", description: "A button component is pressed." },
  { type: "select-used", label: "Select Menu Used", kind: "trigger", description: "A select menu is submitted." },
  { type: "scheduled", label: "Scheduled Event", kind: "trigger", description: "Runs on a schedule." },
  { type: "bot-ready", label: "Bot Ready", kind: "trigger", description: "The bot finishes starting up." },
];

export const CONDITIONS: NodeDef[] = [
  { type: "has-role", label: "User has role", kind: "condition", description: "Continue if the member has a role." },
  { type: "not-has-role", label: "User does not have role", kind: "condition", description: "Continue if the role is missing." },
  { type: "channel-equals", label: "Channel equals", kind: "condition", description: "Match a specific channel." },
  { type: "message-contains", label: "Message contains", kind: "condition", description: "Match text in the message." },
  { type: "account-age", label: "Account age", kind: "condition", description: "Check how old the account is." },
  { type: "permission-check", label: "Permission check", kind: "condition", description: "Require a permission." },
  { type: "custom-condition", label: "Custom condition", kind: "condition", description: "Your own expression." },
];

export const ACTIONS: NodeDef[] = [
  { type: "send-message", label: "Send message", kind: "action", description: "Send a plain text message." },
  { type: "send-embed", label: "Send embed", kind: "action", description: "Send a designed embed." },
  { type: "edit-message", label: "Edit message", kind: "action", description: "Update an existing message." },
  { type: "delete-message", label: "Delete message", kind: "action", description: "Remove a message." },
  { type: "add-role", label: "Add role", kind: "action", description: "Grant a role to the member." },
  { type: "remove-role", label: "Remove role", kind: "action", description: "Take a role away." },
  { type: "kick-member", label: "Kick member", kind: "action", description: "Remove the member from the server." },
  { type: "ban-member", label: "Ban member", kind: "action", description: "Ban the member." },
  { type: "timeout-member", label: "Timeout member", kind: "action", description: "Mute the member temporarily." },
  { type: "create-channel", label: "Create channel", kind: "action", description: "Create a new channel." },
  { type: "delete-channel", label: "Delete channel", kind: "action", description: "Delete a channel." },
  { type: "create-ticket", label: "Create ticket", kind: "action", description: "Open a support ticket." },
  { type: "send-dm", label: "Send DM", kind: "action", description: "Direct message the member." },
  { type: "log-event", label: "Log event", kind: "action", description: "Write to the bot log." },
];

export const ALL_NODE_DEFS = [...TRIGGERS, ...CONDITIONS, ...ACTIONS];

export function nodeDef(type: string): NodeDef | undefined {
  return ALL_NODE_DEFS.find((n) => n.type === type);
}

export const THEME_PRESETS: { id: ThemePreset; name: string; accent: string; embed: string; description: string }[] = [
  { id: "discord-dark", name: "Discord Dark", accent: "#5865F2", embed: "#5865F2", description: "The classic blurple look." },
  { id: "midnight", name: "Midnight", accent: "#2F80ED", embed: "#1F6FEB", description: "Cool blue, low glare." },
  { id: "purple", name: "Purple", accent: "#7C5CFC", embed: "#9B6BFF", description: "Bottly's signature violet." },
  { id: "minimal", name: "Minimal", accent: "#B5BAC1", embed: "#80848E", description: "Neutral and quiet." },
  { id: "custom", name: "Custom", accent: "#23A55A", embed: "#23A55A", description: "Pick your own colors." },
];

export const TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Warsaw",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

export const DISCORD_PERMISSION_BITS: { label: string; value: string }[] = [
  { label: "Administrator", value: "8" },
  { label: "Manage Server", value: "32" },
  { label: "Manage Roles", value: "268435456" },
  { label: "Manage Channels", value: "16" },
  { label: "Kick Members", value: "2" },
  { label: "Ban Members", value: "4" },
  { label: "Manage Messages", value: "8192" },
  { label: "Send Messages", value: "2048" },
  { label: "Embed Links", value: "16384" },
  { label: "Attach Files", value: "32768" },
  { label: "Read Message History", value: "65536" },
  { label: "Moderate Members", value: "1099511627776" },
];
