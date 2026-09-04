import {
  AlertTriangle,
  BellRing,
  Gift,
  Info,
  Megaphone,
  Rocket,
  ShieldAlert,
  Sparkles,
  Store,
  Tag,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

/** Icons an admin can pick for an announcement bar or popup. */
export const ANNOUNCEMENT_ICONS: Record<string, LucideIcon> = {
  megaphone: Megaphone,
  sparkles: Sparkles,
  info: Info,
  warning: AlertTriangle,
  error: ShieldAlert,
  bell: BellRing,
  rocket: Rocket,
  gift: Gift,
  tag: Tag,
  store: Store,
  wrench: Wrench,
  zap: Zap,
};

export const ANNOUNCEMENT_ICON_KEYS = Object.keys(ANNOUNCEMENT_ICONS);

export function announcementIcon(key: string | null | undefined): LucideIcon {
  return (key && ANNOUNCEMENT_ICONS[key]) || Megaphone;
}
