/**
 * Service abstraction for Discord + hosting.
 *
 * Hosting/presence is still a local mock for the MVP. Token handling is NOT
 * mocked and does not live here: tokens are verified and encrypted server-side
 * (src/lib/bot-token.functions.ts) and never reach this module.
 */
import type { Bot } from "@/types/bot";

export interface InviteOptions {
  /** Real Discord application (client) id — 17-20 digits. */
  clientId: string;
  scopes?: string[];
  permissions?: string[];
}

/**
 * Permissions requested by a generated invite URL.
 *
 * Deliberately NOT Administrator (bit 8). A builder-generated bot should ask for
 * what its features need; server owners can always grant more manually.
 */
export const DEFAULT_BOT_PERMISSIONS: string[] = [
  "1024", // View Channels
  "2048", // Send Messages
  "8192", // Manage Messages
  "16384", // Embed Links
  "32768", // Attach Files
  "65536", // Read Message History
  "64", // Add Reactions
  "268435456", // Manage Roles
  "2", // Kick Members
  "4", // Ban Members
  "1099511627776", // Timeout Members
];

const APPLICATION_ID_PATTERN = /^\d{17,20}$/;

export function buildInviteUrl({
  clientId,
  scopes = ["bot", "applications.commands"],
  permissions = DEFAULT_BOT_PERMISSIONS,
}: InviteOptions): string {
  if (!APPLICATION_ID_PATTERN.test(clientId)) {
    // Previously this silently fell back to a placeholder id, producing an
    // invite URL that looked valid and could never work.
    throw new Error("buildInviteUrl requires a real Discord application id.");
  }

  const perms = permissions.reduce((acc, bit) => acc + BigInt(bit), 0n).toString();
  const params = new URLSearchParams({
    client_id: clientId,
    scope: (scopes.length ? scopes : ["bot"]).join(" "),
    permissions: perms,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/**
 * Invite URL for an application id, or null when the bot has no verified token
 * yet (the application id is only known once Discord accepts the token).
 */
export function inviteUrl(applicationId: string | null | undefined): string | null {
  if (!applicationId || !APPLICATION_ID_PATTERN.test(applicationId)) return null;
  return buildInviteUrl({ clientId: applicationId });
}

export interface DeploymentStep {
  label: string;
  duration: number;
}

export const CREATION_STEPS: DeploymentStep[] = [
  { label: "Creating bot configuration...", duration: 750 },
  { label: "Generating commands...", duration: 650 },
  { label: "Applying design...", duration: 600 },
  { label: "Preparing components...", duration: 600 },
  { label: "Preparing automations...", duration: 700 },
  { label: "Finalizing...", duration: 550 },
];

/**
 * @deprecated Replaced by the real control plane in
 * src/lib/bot-runtime.functions.ts (startBotRuntime / stopBotRuntime).
 * This never touched Discord; it is kept only so any leftover caller compiles.
 */
export async function setBotPresence(_bot: Bot, online: boolean): Promise<Bot["status"]> {
  await new Promise((r) => setTimeout(r, 500));
  return online ? "online" : "offline";
}
