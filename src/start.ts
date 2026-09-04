import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachVerifiedAuth } from "@/lib/function-auth-middleware";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
  // Apex/www and the preview host are the same site but not always the same
  // origin, and behind the edge proxy request.url can differ from the public
  // host, so compare against the forwarded Host header instead.
  secFetchSite: ["same-origin", "same-site"],
  origin: (origin, ctx) => {
    try {
      const originHost = new URL(origin).host;
      const requestHost =
        ctx.request.headers.get("x-forwarded-host") ??
        ctx.request.headers.get("host") ??
        new URL(ctx.request.url).host;
      const strip = (host: string) => host.replace(/^www\./, "").toLowerCase();
      return strip(originHost) === strip(requestHost);
    } catch {
      return false;
    }
  },
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachVerifiedAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
}));
