import type { PlanId } from "@/types/bot";

export interface PlanLimits {
  /** Maximum number of bots on the account. `null` = unlimited. */
  bots: number | null;
  /** Maximum number of commands / flows per bot. `null` = unlimited. */
  commands: number | null;
  /** Maximum AI assistant messages per day. */
  aiPerDay: number;
  /** Whether the bot description and branding fields can be edited. */
  branding: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { bots: 1, commands: 5, aiPerDay: 10, branding: false },
  pro: { bots: 5, commands: 50, aiPerDay: 200, branding: true },
  ultimate: { bots: null, commands: null, aiPerDay: 1000, branding: true },
};

export const PLAN_LABEL: Record<PlanId, string> = {
  free: "Free",
  pro: "Pro",
  ultimate: "Ultimate",
};

export function limitLabel(value: number | null): string {
  return value === null ? "Unlimited" : String(value);
}
