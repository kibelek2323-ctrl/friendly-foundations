import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type PostKind = "blog" | "changelog";

export interface BlogPost {
  id: string;
  kind: PostKind;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverUrl: string | null;
  version: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
}

interface PostRow {
  id: string;
  kind: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  cover_url: string | null;
  version: string | null;
  published: boolean | null;
  published_at: string | null;
  created_at: string;
}

const COLUMNS = "id, kind, slug, title, excerpt, body, cover_url, version, published, published_at, created_at";

function toPost(r: PostRow): BlogPost {
  return {
    id: r.id,
    kind: (r.kind === "changelog" ? "changelog" : "blog") as PostKind,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt ?? "",
    body: r.body ?? "",
    coverUrl: r.cover_url,
    version: r.version,
    published: r.published ?? false,
    publishedAt: r.published_at,
    createdAt: r.created_at,
  };
}

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listPosts = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ kind: z.enum(["blog", "changelog"]).default("blog") }).parse(data ?? {}))
  .handler(async ({ data }): Promise<BlogPost[]> => {
    const { data: rows } = await publicClient()
      .from("blog_posts")
      .select(COLUMNS)
      .eq("kind", data.kind)
      .eq("published", true)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(100);
    return ((rows ?? []) as PostRow[]).map(toPost);
  });

export const getPost = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(1).max(160) }).parse(data))
  .handler(async ({ data }): Promise<BlogPost | null> => {
    const { data: row } = await publicClient()
      .from("blog_posts")
      .select(COLUMNS)
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    return row ? toPost(row as PostRow) : null;
  });

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const supabase = context.supabase as {
    rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => Promise<{ data: unknown }>;
  };
  const { data } = await supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("Forbidden");
}

export const adminListPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BlogPost[]> => {
    await assertAdmin(context);
    const { data: rows } = await context.supabase
      .from("blog_posts")
      .select(COLUMNS)
      .order("created_at", { ascending: false })
      .limit(200);
    return ((rows ?? []) as PostRow[]).map(toPost);
  });

const postInput = z.object({
  id: z.string().uuid().nullable().default(null),
  kind: z.enum(["blog", "changelog"]).default("blog"),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes only"),
  title: z.string().min(2).max(160),
  excerpt: z.string().max(400).default(""),
  body: z.string().max(50000).default(""),
  coverUrl: z.string().url().max(500).nullable().default(null),
  version: z.string().max(40).nullable().default(null),
  published: z.boolean().default(false),
});

export const savePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => postInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      kind: data.kind,
      slug: data.slug,
      title: data.title,
      excerpt: data.excerpt,
      body: data.body,
      cover_url: data.coverUrl,
      version: data.version,
      published: data.published,
      published_at: data.published ? new Date().toISOString() : null,
      author_id: context.userId,
    };

    if (data.id) {
      const { data: existing } = await context.supabase
        .from("blog_posts")
        .select("published_at")
        .eq("id", data.id)
        .maybeSingle();
      const keepDate = (existing as { published_at: string | null } | null)?.published_at;
      const { error } = await context.supabase
        .from("blog_posts")
        .update({ ...payload, published_at: data.published ? (keepDate ?? payload.published_at) : null })
        .eq("id", data.id);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const, id: data.id };
    }

    const { data: inserted, error } = await context.supabase
      .from("blog_posts")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, id: (inserted as { id: string }).id };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("blog_posts").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
