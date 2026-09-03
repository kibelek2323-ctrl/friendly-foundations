/**
 * Environment configuration. Anything invalid throws at boot: a runtime that
 * cannot authenticate or decrypt tokens should fail loudly, not half-work.
 */
import { GatewayIntentBits } from "discord.js";
import { logger } from "./logger.js";

/** Both shared secrets are the entire security perimeter of this service. */
const MIN_SECRET_LENGTH = 32;

/**
 * Non-privileged intents that are always requested. Guilds is required for the
 * guild cache (guild_count); GuildMessages is what message-triggered flows need.
 * Privileged intents (GuildMembers, GuildPresences, MessageContent) must be
 * enabled in the Discord developer portal AND listed in DISCORD_EXTRA_INTENTS.
 */
const DEFAULT_INTENT_NAMES = ["Guilds", "GuildMessages"] as const;

export interface RuntimeConfig {
  host: string;
  port: number;
  /** Inbound: control plane → runtime (BOT_RUNTIME_SHARED_SECRET). */
  inboundSecret: string;
  /** Outbound: runtime → control plane (BOT_RUNTIME_CALLBACK_SECRET). */
  callbackSecret: string;
  /** Origin of the web app, no trailing slash. */
  controlPlaneUrl: string;
  intents: number[];
  maxConcurrentBots: number;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}.`);
  return value;
}

function requireSecret(name: string): string {
  const value = requireEnv(name);
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${name} must be at least ${MIN_SECRET_LENGTH} characters. ` +
        `Generate one with: node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`,
    );
  }
  return value;
}

function parsePort(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const port = Number.parseInt(raw, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`BOT_RUNTIME_PORT must be a port number between 1 and 65535, got "${raw}".`);
  }
  return port;
}

function parsePositiveInt(name: string, raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer, got "${raw}".`);
  }
  return value;
}

function parseControlPlaneUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`CONTROL_PLANE_URL must be an absolute URL, got "${raw}".`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(`CONTROL_PLANE_URL must use http or https, got "${parsed.protocol}".`);
  }
  const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol === "http:" && !isLocal) {
    // The callback secret and encrypted tokens travel over this connection.
    logger.warn(
      `CONTROL_PLANE_URL uses plain http (${parsed.origin}). Use https outside local development.`,
    );
  }
  return parsed.origin + parsed.pathname.replace(/\/+$/, "");
}

/**
 * Resolves intent names against discord.js's own enum, so no intent name is
 * hardcoded (and typos fail at boot instead of at identify time).
 */
function parseIntents(raw: string | undefined): number[] {
  const extra = (raw ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const table = GatewayIntentBits as unknown as Record<string, number | string | undefined>;
  const bits: number[] = [];

  for (const name of [...DEFAULT_INTENT_NAMES, ...extra]) {
    const bit = table[name];
    if (typeof bit !== "number") {
      throw new Error(
        `Unknown gateway intent "${name}" in DISCORD_EXTRA_INTENTS. ` +
          "Use the discord.js GatewayIntentBits names, e.g. GuildMembers,MessageContent.",
      );
    }
    if (!bits.includes(bit)) bits.push(bit);
  }

  return bits;
}

function load(): RuntimeConfig {
  return {
    host: process.env["BOT_RUNTIME_HOST"]?.trim() || "0.0.0.0",
    port: parsePort(process.env["BOT_RUNTIME_PORT"], 8787),
    inboundSecret: requireSecret("BOT_RUNTIME_SHARED_SECRET"),
    callbackSecret: requireSecret("BOT_RUNTIME_CALLBACK_SECRET"),
    controlPlaneUrl: parseControlPlaneUrl(requireEnv("CONTROL_PLANE_URL")),
    intents: parseIntents(process.env["DISCORD_EXTRA_INTENTS"]),
    maxConcurrentBots: parsePositiveInt(
      "MAX_CONCURRENT_BOTS",
      process.env["MAX_CONCURRENT_BOTS"],
      50,
    ),
  };
}

export const config: RuntimeConfig = load();