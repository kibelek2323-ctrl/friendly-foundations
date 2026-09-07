import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Server-side enforcement of email two-factor authentication.
 *
 * Registered globally in src/start.ts, so EVERY server function call carrying a
 * Supabase token is rejected while that session still owes a second factor —
 * no matter how the session was created (password, Google, Discord) and no
 * matter whether the caller followed the UI flow.
 *
 * Only the handful of calls needed to actually complete the challenge are
 * allowed through.
 */
const ALLOWED = [
  "verifyTwoFactorCode",
  "sendTwoFactorCode",
  "startLoginChallenge",
  "getTwoFactorGate",
  "getTwoFactorStatus",
];

function isAllowed(url: string): boolean {
  return ALLOWED.some((name) => url.includes(name));
}

export const enforceTwoFactor = createMiddleware({ type: "function" }).server(async ({ next, context }) => {
  const request = getRequest();
  const headers = request?.headers;
  const token =
    headers?.get("x-bottly-access-token")?.trim() ||
    headers?.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    (context as { bottlyAccessToken?: string } | undefined)?.bottlyAccessToken?.trim() ||
    "";

  if (token && !isAllowed(request?.url ?? "")) {
    const { tokenNeedsTwoFactor } = await import("./twofa-session.server");
    if (await tokenNeedsTwoFactor(token)) {
      throw new Error("Unauthorized: two-factor verification required");
    }
  }

  return next();
});
