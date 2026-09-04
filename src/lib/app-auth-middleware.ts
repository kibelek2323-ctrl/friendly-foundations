import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function createApiFetch(apiKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    if (apiKey.startsWith("sb_") && headers.get("Authorization") === `Bearer ${apiKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", apiKey);
    return fetch(input, { ...init, headers });
  };
}

/** Auth middleware that survives proxies which replace the standard Authorization header. */
export const requireAppAuth = createMiddleware({ type: "function" }).server(async ({ next, context }) => {
  const url = process.env["SUPABASE_URL"];
  const apiKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !apiKey) throw new Error("Backend authentication is not configured");

  const headers = getRequest().headers;
  const forwardedToken = headers.get("x-bottly-access-token")?.trim();
  const bearer = headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const payloadToken = (context as { bottlyAccessToken?: string } | undefined)?.bottlyAccessToken?.trim();
  const token = forwardedToken || bearer || payloadToken;
  if (!token || token.split(".").length !== 3) {
    console.error(
      `[auth] no usable token (header=${Boolean(forwardedToken)} bearer=${Boolean(bearer)} payload=${Boolean(payloadToken)})`,
    );
    throw new Error("Unauthorized: Invalid token");
  }

  const supabase = createClient<Database>(url, apiKey, {
    global: {
      fetch: createApiFetch(apiKey),
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) {
    console.error(`[auth] token rejected by Supabase: ${error?.message ?? "no claims"}`);
    throw new Error("Unauthorized: Invalid token");
  }

  return next({ context: { supabase, userId, claims: data.claims } });
});