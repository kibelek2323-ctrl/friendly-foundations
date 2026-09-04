/**
 * bottly_config.json — the configuration schema a Developer defines for a bot
 * project. Buyers never see this file; they get a generated form built from the
 * settings marked `editable`, and their values are stored separately.
 */

export const CONFIG_TYPES = [
  "text",
  "textarea",
  "number",
  "boolean",
  "color",
  "emoji",
  "select",
  "role",
  "channel",
  "user",
  "url",
] as const;

export type ConfigType = (typeof CONFIG_TYPES)[number];

export const CONFIG_TYPE_LABEL: Record<ConfigType, string> = {
  text: "Text",
  textarea: "Textarea",
  number: "Number",
  boolean: "Toggle",
  color: "Color",
  emoji: "Emoji",
  select: "Select",
  role: "Discord role ID",
  channel: "Discord channel ID",
  user: "Discord user ID",
  url: "URL",
};

/** Values a setting can hold. Must stay JSON-serializable for the RPC boundary. */
export type ConfigValue = string | number | boolean;

export interface ConfigOption {
  label: string;
  value: string;
}

export interface ConfigSetting {
  type: ConfigType;
  label: string;
  description?: string | undefined;
  default?: ConfigValue | undefined;
  /** Buyers may change it. Internal settings never leave the backend. */
  editable: boolean;
  /** Internal settings are hidden from buyers entirely. */
  internal?: boolean | undefined;
  required?: boolean | undefined;
  placeholder?: string | undefined;
  category?: string | undefined;
  options?: ConfigOption[] | undefined;
  min?: number | undefined;
  max?: number | undefined;
  pattern?: string | undefined;
}

export interface BotConfigSchema {
  version: number;
  settings: Record<string, ConfigSetting>;
}

export const EMPTY_SCHEMA: BotConfigSchema = { version: 1, settings: {} };

export const KEY_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]{0,48}$/;

export interface ValidationIssue {
  key: string;
  message: string;
}

/** Validate a schema authored by a Developer. Returns every problem found. */
export function validateSchema(input: unknown): { ok: boolean; issues: ValidationIssue[]; schema?: BotConfigSchema } {
  const issues: ValidationIssue[] = [];
  if (typeof input !== "object" || input === null) {
    return { ok: false, issues: [{ key: "*", message: "Configuration must be a JSON object." }] };
  }
  const raw = input as Partial<BotConfigSchema>;
  if (typeof raw.version !== "number" || raw.version < 1) {
    issues.push({ key: "version", message: "version must be a number of 1 or higher." });
  }
  if (typeof raw.settings !== "object" || raw.settings === null || Array.isArray(raw.settings)) {
    return { ok: false, issues: [...issues, { key: "settings", message: "settings must be an object." }] };
  }

  const seen = new Set<string>();
  for (const [key, value] of Object.entries(raw.settings)) {
    const lower = key.toLowerCase();
    if (seen.has(lower)) issues.push({ key, message: "Duplicate key." });
    seen.add(lower);
    if (!KEY_PATTERN.test(key)) {
      issues.push({ key, message: "Key must start with a letter and contain only letters, numbers or underscores." });
      continue;
    }
    if (typeof value !== "object" || value === null) {
      issues.push({ key, message: "Setting must be an object." });
      continue;
    }
    const s = value as ConfigSetting;
    if (!CONFIG_TYPES.includes(s.type)) {
      issues.push({ key, message: `Unknown type "${String(s.type)}".` });
      continue;
    }
    if (!s.label || typeof s.label !== "string") issues.push({ key, message: "A label is required." });
    if (s.type === "select") {
      if (!Array.isArray(s.options) || s.options.length === 0) {
        issues.push({ key, message: "Select settings need at least one option." });
      } else if (new Set(s.options.map((o) => o.value)).size !== s.options.length) {
        issues.push({ key, message: "Select options must have unique values." });
      }
    }
    if (s.type === "number" && s.min != null && s.max != null && s.min > s.max) {
      issues.push({ key, message: "min cannot be greater than max." });
    }
    if (s.default !== undefined) {
      const err = validateValue(s, s.default);
      if (err) issues.push({ key, message: `Default value: ${err}` });
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    issues: [],
    schema: { version: raw.version as number, settings: raw.settings as Record<string, ConfigSetting> },
  };
}

/** Validate one value against its setting. Returns an error message or null. */
export function validateValue(setting: ConfigSetting, value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return setting.required ? "This field is required." : null;
  }
  switch (setting.type) {
    case "number": {
      if (typeof value !== "number" || Number.isNaN(value)) return "Must be a number.";
      if (setting.min != null && value < setting.min) return `Must be ${setting.min} or more.`;
      if (setting.max != null && value > setting.max) return `Must be ${setting.max} or less.`;
      return null;
    }
    case "boolean":
      return typeof value === "boolean" ? null : "Must be true or false.";
    case "color":
      return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? null : "Must be a hex color like #5865F2.";
    case "select":
      return (setting.options ?? []).some((o) => o.value === value) ? null : "Pick one of the available options.";
    case "role":
    case "channel":
    case "user":
      return typeof value === "string" && /^\d{5,25}$/.test(value) ? null : "Must be a Discord ID (numbers only).";
    case "url": {
      if (typeof value !== "string") return "Must be a URL.";
      try {
        const u = new URL(value);
        return u.protocol === "http:" || u.protocol === "https:" ? null : "Must be an http(s) URL.";
      } catch {
        return "Must be a valid URL.";
      }
    }
    case "emoji":
      return typeof value === "string" && value.length <= 32 ? null : "Must be a short emoji.";
    default: {
      if (typeof value !== "string") return "Must be text.";
      if (setting.pattern) {
        try {
          if (!new RegExp(setting.pattern).test(value)) return "Value does not match the required format.";
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}

/** Settings a buyer is allowed to see and change. */
export function buyerVisibleSettings(schema: BotConfigSchema): Array<[string, ConfigSetting]> {
  return Object.entries(schema.settings ?? {}).filter(([, s]) => s.editable === true && s.internal !== true);
}

/** Strip anything the buyer may not write, then validate what is left. */
export function sanitizeBuyerValues(
  schema: BotConfigSchema,
  values: Record<string, ConfigValue>,
): { values: Record<string, ConfigValue>; issues: ValidationIssue[] } {
  const allowed = new Map(buyerVisibleSettings(schema));
  const out: Record<string, ConfigValue> = {};
  const issues: ValidationIssue[] = [];
  for (const [key, setting] of allowed) {
    const value = values[key];
    if (value === undefined) continue;
    const error = validateValue(setting, value);
    if (error) issues.push({ key, message: error });
    else out[key] = value;
  }
  for (const [key, setting] of allowed) {
    if (setting.required && out[key] === undefined && setting.default === undefined) {
      issues.push({ key, message: "This field is required." });
    }
  }
  return { values: out, issues };
}

/** Defaults merged with the buyer's saved values. */
export function mergeWithDefaults(
  schema: BotConfigSchema,
  values: Record<string, ConfigValue>,
): Record<string, ConfigValue> {
  const out: Record<string, ConfigValue> = {};
  for (const [key, setting] of buyerVisibleSettings(schema)) {
    const stored = values[key];
    out[key] = stored !== undefined ? stored : (setting.default ?? defaultForType(setting));
  }
  return out;
}

export function defaultForType(setting: ConfigSetting): ConfigValue {
  switch (setting.type) {
    case "number":
      return setting.min ?? 0;
    case "boolean":
      return false;
    case "color":
      return "#5865F2";
    case "select":
      return setting.options?.[0]?.value ?? "";
    default:
      return "";
  }
}

export const STARTER_CONFIG: BotConfigSchema = {
  version: 1,
  settings: {
    botName: {
      type: "text",
      label: "Bot Name",
      description: "Name displayed by the bot",
      default: "My Bot",
      editable: true,
    },
    primaryColor: { type: "color", label: "Primary Color", default: "#5865F2", editable: true },
  },
};
