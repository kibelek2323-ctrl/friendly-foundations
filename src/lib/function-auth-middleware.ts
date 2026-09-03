import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

let lastValidatedToken: string | null = null;

/** Attaches a verified session token and refreshes stale sessions before protected server calls. */
export const attachVerifiedAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  let { data } = await supabase.auth.getSession();
  let token = data.session?.access_token ?? null;

  if (token && token !== lastValidatedToken) {
    const { error } = await supabase.auth.getUser(token);
    if (error) {
      const refreshed = await supabase.auth.refreshSession();
      token = refreshed.data.session?.access_token ?? null;
    }
    lastValidatedToken = token;
  }

  return next({
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
          "X-Bottly-Access-Token": token,
        }
      : {},
  });
});