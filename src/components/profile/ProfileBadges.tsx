import {
  BadgeCheck,
  Bot,
  Bug,
  Crown,
  Hammer,
  Handshake,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { badgeDef, type BadgeDef } from "@/lib/badges";
import { cn } from "@/lib/utils";

const ICONS: Record<BadgeDef["icon"], LucideIcon> = {
  "badge-check": BadgeCheck,
  "shield-check": ShieldCheck,
  crown: Crown,
  handshake: Handshake,
  sparkles: Sparkles,
  bug: Bug,
  bot: Bot,
  hammer: Hammer,
  "trending-up": TrendingUp,
  trophy: Trophy,
  star: Star,
};

const TONES: Record<BadgeDef["tone"], string> = {
  primary: "border-primary/40 bg-primary/10 text-primary",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  muted: "border-border bg-elevated text-muted-foreground",
};

export function ProfileBadges({ badges, className }: { badges: string[]; className?: string }) {
  const defs = badges.map(badgeDef).filter((d): d is BadgeDef => !!d);
  if (defs.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {defs.map((d) => {
        const Icon = ICONS[d.icon];
        return (
          <li key={d.key}>
            <span
              title={d.description}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                TONES[d.tone],
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {d.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
