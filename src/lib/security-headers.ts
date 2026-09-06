/**
 * Baseline browser security headers for every HTML document response.
 *
 * Applied as a request middleware in src/start.ts. Only document responses get
 * the full policy set; API/JSON responses get the cheap, always-safe headers.
 */

const PREVIEW_HOST = /(^|\.)(lovable\.app|lovableproject\.com|lovable\.dev)$|^localhost(:\d+)?$/i;

/** Hosts allowed to embed the app in a frame (clickjacking protection). */
function frameAncestors(host: string): string {
  // The Lovable editor renders the app inside an iframe, so preview hosts must
  // stay embeddable. The public site is never embeddable.
  return PREVIEW_HOST.test(host)
    ? "'self' https://lovable.dev https://*.lovable.dev https://*.lovable.app"
    : "'self'";
}

function contentSecurityPolicy(host: string): string {
  const isPreview = PREVIEW_HOST.test(host);
  const lovable = isPreview
    ? " https://lovable.dev https://*.lovable.dev https://*.lovable.app https://oauth.lovable.app https://cdn.gpteng.co"
    : "";

  return [
    "default-src 'self'",
    // The framework inlines hydration scripts; the editor injects its own in preview.
    `script-src 'self' 'unsafe-inline' 'unsafe-eval'${lovable}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    [
      "connect-src 'self' ws: wss: blob: data:",
      "https://*.supabase.co wss://*.supabase.co",
      "https://cdn.discordapp.com https://discord.com",
      "https://oauth.lovable.app https://*.lovable.app https://lovable.dev https://*.lovable.dev",
      "https://ai.gateway.lovable.dev",
    ].join(" "),
    "worker-src 'self' blob:",
    "frame-src 'self' https://discord.com",
    `frame-ancestors ${frameAncestors(host)}`,
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "autoplay=()",
  "camera=()",
  "display-capture=()",
  "encrypted-media=()",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "usb=()",
  "interest-cohort=()",
].join(", ");

export function applySecurityHeaders(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);

  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("Permissions-Policy", PERMISSIONS_POLICY);
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  const contentType = headers.get("content-type") ?? "";
  if (contentType.includes("text/html")) {
    const host =
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      (() => {
        try {
          return new URL(request.url).host;
        } catch {
          return "";
        }
      })();

    headers.set("Content-Security-Policy", contentSecurityPolicy(host));
    // Legacy equivalent of frame-ancestors for older browsers.
    if (PREVIEW_HOST.test(host)) {
      headers.delete("X-Frame-Options");
    } else {
      headers.set("X-Frame-Options", "SAMEORIGIN");
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
