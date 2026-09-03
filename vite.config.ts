// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    plugins: [
      {
        name: "normalize-generated-supabase-env-access",
        enforce: "pre",
        transform(code, id) {
          if (!id.replaceAll("\\", "/").endsWith("/src/integrations/supabase/client.ts")) {
            return null;
          }

          // Public, non-secret Lovable Cloud values. Used as a fallback when the
          // build environment does not expose the managed variables.
          const FALLBACK_URL = "https://luwooudtcydwbnfgjuzz.supabase.co";
          const FALLBACK_KEY = "sb_publishable_foOAAPkU65MF1qlhpj0nRg_91UY1aLb";

          const supabaseUrl =
            process.env['VITE_SUPABASE_URL'] ?? process.env['SUPABASE_URL'] ?? FALLBACK_URL;
          const publishableKey =
            process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] ??
            process.env['SUPABASE_PUBLISHABLE_KEY'] ??
            FALLBACK_KEY;

          const normalized = code
            .replaceAll(
              "import.meta.env['VITE_SUPABASE_URL']",
              JSON.stringify(supabaseUrl),
            )
            .replaceAll(
              "import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY']",
              JSON.stringify(publishableKey),
            )
            .replaceAll(
              "process.env['SUPABASE_URL']",
              JSON.stringify(supabaseUrl),
            )
            .replaceAll(
              "process.env['SUPABASE_PUBLISHABLE_KEY']",
              JSON.stringify(publishableKey),
            );

          return normalized === code ? null : { code: normalized, map: null };

        },
      },
    ],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
