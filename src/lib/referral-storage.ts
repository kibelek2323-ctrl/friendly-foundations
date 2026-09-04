export const PENDING_REFERRAL_KEY = "bottly.pending-referral";

export function takePendingReferral(): string | null {
  if (typeof window === "undefined") return null;
  const code = localStorage.getItem(PENDING_REFERRAL_KEY);
  if (code) localStorage.removeItem(PENDING_REFERRAL_KEY);
  return code;
}
