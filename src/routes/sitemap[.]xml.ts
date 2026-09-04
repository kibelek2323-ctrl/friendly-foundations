import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://bottly.xyz";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/marketplace", changefreq: "daily", priority: "0.9" },
          { path: "/templates", changefreq: "weekly", priority: "0.7" },
          { path: "/pricing", changefreq: "monthly", priority: "0.7" },
          { path: "/docs", changefreq: "weekly", priority: "0.7" },
          { path: "/blog", changefreq: "weekly", priority: "0.7" },
          { path: "/changelog", changefreq: "weekly", priority: "0.5" },
          { path: "/faq", changefreq: "monthly", priority: "0.6" },
          { path: "/about", changefreq: "monthly", priority: "0.5" },
          { path: "/status", changefreq: "weekly", priority: "0.4" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
        ];

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const pageSize = 1000;
          for (let offset = 0; ; offset += pageSize) {
            const { data, error } = await supabaseAdmin
              .from("blog_posts")
              .select("slug, published_at, kind")
              .eq("published", true)
              .order("slug")
              .range(offset, offset + pageSize - 1);
            if (error || !data) break;
            for (const post of data) {
              if (post.kind !== "blog") continue;
              const entry: SitemapEntry = { path: `/blog/${encodeURIComponent(post.slug)}` };
              if (post.published_at) entry.lastmod = post.published_at;
              entries.push(entry);
            }
            if (data.length < pageSize) break;
          }

          for (let offset = 0; ; offset += pageSize) {
            const { data, error } = await supabaseAdmin
              .from("marketplace_listings")
              .select("id")
              .eq("published", true)
              .order("id")
              .range(offset, offset + pageSize - 1);
            if (error || !data) break;
            for (const listing of data) {
              entries.push({ path: `/marketplace/${listing.id}`, changefreq: "weekly" });
            }
            if (data.length < pageSize) break;
          }
        } catch {
          // dynamic content unavailable — serve the static pages
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
