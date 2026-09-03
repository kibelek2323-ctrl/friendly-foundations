import type { Bot, LogEntry } from "@/types/bot";
import { createAutomation, createCommand, createEmbed, createComponent, defaultDesign, defaultEvents } from "./factories";
import { uid } from "@/lib/id";

function logs(seed: string): LogEntry[] {
  const base = Date.now();
  const rows: Array<[string, LogEntry["level"], string, number]> = [
    ["Bot started", "success", `${seed} connected to the gateway in 412ms.`, 2],
    ["Command executed", "info", "/help was used by aria#0001 in #general.", 14],
    ["Member joined", "info", "kaito joined Neon Collective (2,481 members).", 41],
    ["Ticket created", "success", "Ticket #0192 opened by lumen for billing help.", 96],
    ["Automation executed", "success", "Welcome flow ran for 3 new members.", 140],
    ["Rate limited", "warning", "Bucket /channels/:id/messages paused for 1.2s.", 220],
    ["Error", "error", "Missing Permissions while assigning @Verified.", 310],
    ["Command executed", "info", "/ban was used by moderator dex#4412.", 420],
  ];
  return rows.map(([event, level, description, mins]) => ({
    id: uid("log"),
    timestamp: new Date(base - mins * 60_000).toISOString(),
    event,
    level,
    description,
  }));
}

function helperCommands() {
  return [
    createCommand({ name: "help", description: "Show every command this bot supports." }),
    createCommand({ name: "ticket", description: "Open a private support ticket.", permissions: [] }),
    createCommand({ name: "ban", description: "Ban a member from the server.", permissions: ["Ban Members"] }),
    createCommand({ name: "kick", description: "Kick a member from the server.", permissions: ["Kick Members"] }),
    createCommand({ name: "warn", description: "Issue a warning to a member.", permissions: ["Moderate Members"] }),
    createCommand({ name: "clear", description: "Bulk delete recent messages.", permissions: ["Manage Messages"] }),
    createCommand({ name: "server", description: "Show server statistics." }),
    createCommand({ name: "user", description: "Show information about a member." }),
  ];
}

export function seedBots(): Bot[] {
  const now = Date.now();
  const mk = (
    name: string,
    username: string,
    description: string,
    status: Bot["status"],
    servers: number,
    members: number,
    commandCount: number,
    plan: Bot["plan"],
    accent: string,
    updatedMinsAgo: number,
  ): Bot => {
    const design = defaultDesign(name);
    design.accentColor = accent;
    design.embedColor = accent;
    design.embeds = [
      createEmbed({
        title: `${name} — Getting started`,
        description: "Use `/help` to see every command. Need a human? Open a ticket and a moderator will reply.",
        color: accent,
        fields: [
          { id: uid("fld"), name: "Commands", value: `${commandCount} registered`, inline: true },
          { id: uid("fld"), name: "Servers", value: `${servers} connected`, inline: true },
        ],
        footer: { text: `${name} • Bottly`, icon: "" },
      }),
    ];
    const commands = helperCommands().slice(0, Math.min(8, commandCount));
    return {
      id: uid("bot"),
      name,
      username,
      description,
      avatar: "",
      status,
      plan,
      language: "javascript",
      timezone: "UTC",
      servers,
      members,
      uptime: status === "online" ? "99.94%" : "0%",
      features: ["moderation", "tickets", "welcome", "logging"],
      design,
      commands,
      components: [createComponent("button"), createComponent("string-select")],
      automations: [createAutomation({ name: "Welcome new members", description: "Greet verified accounts and assign a role." })],
      events: defaultEvents(),
      logs: logs(name),
      applicationId: null,
      createdAt: new Date(now - 1000 * 60 * 60 * 24 * 30).toISOString(),
      updatedAt: new Date(now - updatedMinsAgo * 60_000).toISOString(),
    };
  };

  return [
    mk("Bottly Helper", "bottly-helper", "Support tickets, onboarding and FAQ answers for your community.", "online", 8, 12480, 24, "pro", "#5865F2", 22),
    mk("Empire Bot", "empire-bot", "Economy, leveling and giveaways for a large gaming network.", "online", 12, 48120, 18, "ultimate", "#7C5CFC", 180),
    mk("Moderation Pro", "moderation-pro", "Automated moderation, filters and full audit logging.", "offline", 5, 6320, 31, "pro", "#ED4245", 1440),
  ];
}
