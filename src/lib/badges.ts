/** Shared badge catalog used on public profiles and in the admin panel. */

export type BadgeKey =
  | "verified"
  | "official"
  | "staff"
  | "partner"
  | "early_supporter"
  | "bug_hunter"
  | "first_bot"
  | "bot_smith"
  | "rising_star"
  | "top_seller"
  | "five_star";

export interface BadgeDef {
  key: BadgeKey;
  label: string;
  description: string;
  /** Manual badges are granted by admins, earned ones are computed from activity. */
  kind: "manual" | "earned";
  tone: "primary" | "success" | "warning" | "muted";
  icon:
    | "badge-check"
    | "shield-check"
    | "crown"
    | "handshake"
    | "sparkles"
    | "bug"
    | "bot"
    | "hammer"
    | "trending-up"
    | "trophy"
    | "star";
}

export const BADGES: BadgeDef[] = [
  {
    key: "verified",
    label: "Verified",
    description: "Identity confirmed by the Bottly team.",
    kind: "manual",
    tone: "primary",
    icon: "badge-check",
  },
  {
    key: "official",
    label: "Official",
    description: "Official Bottly account or partner brand.",
    kind: "manual",
    tone: "primary",
    icon: "shield-check",
  },
  {
    key: "staff",
    label: "Staff",
    description: "Member of the Bottly team.",
    kind: "manual",
    tone: "warning",
    icon: "crown",
  },
  {
    key: "partner",
    label: "Partner",
    description: "Works with Bottly on featured bots.",
    kind: "manual",
    tone: "success",
    icon: "handshake",
  },
  {
    key: "early_supporter",
    label: "Early supporter",
    description: "Joined Bottly in its first season.",
    kind: "manual",
    tone: "muted",
    icon: "sparkles",
  },
  {
    key: "bug_hunter",
    label: "Bug hunter",
    description: "Reported issues that made Bottly better.",
    kind: "manual",
    tone: "muted",
    icon: "bug",
  },
  {
    key: "first_bot",
    label: "First bot",
    description: "Published a first bot on the marketplace.",
    kind: "earned",
    tone: "muted",
    icon: "bot",
  },
  {
    key: "bot_smith",
    label: "Bot smith",
    description: "Published 5 or more bots.",
    kind: "earned",
    tone: "success",
    icon: "hammer",
  },
  {
    key: "rising_star",
    label: "Rising star",
    description: "Reached 10 marketplace sales.",
    kind: "earned",
    tone: "success",
    icon: "trending-up",
  },
  {
    key: "top_seller",
    label: "Top seller",
    description: "Reached 100 marketplace sales.",
    kind: "earned",
    tone: "warning",
    icon: "trophy",
  },
  {
    key: "five_star",
    label: "Five star creator",
    description: "4.5+ average rating from at least 5 reviews.",
    kind: "earned",
    tone: "warning",
    icon: "star",
  },
];

export const MANUAL_BADGES = BADGES.filter((b) => b.kind === "manual");

export function badgeDef(key: string): BadgeDef | undefined {
  return BADGES.find((b) => b.key === key);
}

export function earnedBadges(stats: {
  listingCount: number;
  salesCount: number;
  rating: number;
  reviewCount: number;
}): BadgeKey[] {
  const out: BadgeKey[] = [];
  if (stats.listingCount >= 1) out.push("first_bot");
  if (stats.listingCount >= 5) out.push("bot_smith");
  if (stats.salesCount >= 10) out.push("rising_star");
  if (stats.salesCount >= 100) out.push("top_seller");
  if (stats.rating >= 4.5 && stats.reviewCount >= 5) out.push("five_star");
  return out;
}
