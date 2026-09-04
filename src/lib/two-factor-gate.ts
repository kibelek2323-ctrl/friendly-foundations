export const TWO_FACTOR_PENDING_KEY = "bottly.2fa.pending";

export function isTwoFactorPending(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(TWO_FACTOR_PENDING_KEY) === "1";
}

export function clearTwoFactorPending(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TWO_FACTOR_PENDING_KEY);
}
