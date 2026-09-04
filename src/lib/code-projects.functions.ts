import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STARTER_CONFIG } from "@/lib/bot-config";

export interface CodeProject {
  id: string;
  botId: string;
  name: string;
  runtime: string;
  storagePrefix: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFile {
  path: string;
  size: number;
  contentType: string;
  isFolder: boolean;
  updatedAt: string;
}

/** Path of the config schema file inside every code project. */
export const CONFIG_FILE = "bottly_config.json";

const TEXT_EXTENSIONS = /\.(js|jsx|ts|tsx|json|md|txt|env|yml|yaml|css|html|py|sql|sh)$/i;

function contentTypeFor(path: string): string {
  if (/\.json$/i.test(path)) return "application/json";
  if (/\.(js|jsx|mjs|cjs)$/i.test(path)) return "text/javascript";
  if (/\.(ts|tsx)$/i.test(path)) return "text/plain";
  if (/\.md$/i.test(path)) return "text/markdown";
  if (/\.css$/i.test(path)) return "text/css";
  if (/\.html?$/i.test(path)) return "text/html";
  if (/\.png$/i.test(path)) return "image/png";
  if (/\.jpe?g$/i.test(path)) return "image/jpeg";
  if (/\.svg$/i.test(path)) return "image/svg+xml";
  return "text/plain";
}

export function isTextFile(path: string): boolean {
  return TEXT_EXTENSIONS.test(path);
}

/** Developer rank + project ownership. Throws so callers get a 403-style failure. */
async function requireOwnedProject(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  context: any,
  projectId: string,
): Promise<{ id: string; storage_prefix: string; owner_id: string }> {
  const { hasDeveloperAccess } = await import("./roles.functions");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(await hasDeveloperAccess(context as any))) {
    throw new Error("Forbidden: Developer access is required for this action.");
  }
  const { data: project } = await context.supabase
    .from("code_projects")
    .select("id, storage_prefix, owner_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || project.owner_id !== context.userId) {
    throw new Error("Forbidden: You do not own this project.");
  }
  return project;
}

const projectIdInput = z.object({ projectId: z.string().uuid() });

export const listMyProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CodeProject[]> => {
    const { data } = await context.supabase
      .from("code_projects")
      .select("id, bot_id, name, runtime, storage_prefix, created_at, updated_at")
      .eq("owner_id", context.userId)
      .order("updated_at", { ascending: false });
    return (data ?? []).map((r) => ({
      id: r.id,
      botId: r.bot_id,
      name: r.name,
      runtime: r.runtime,
      storagePrefix: r.storage_prefix,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  });

export const getProjectForBot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ botId: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }): Promise<CodeProject | null> => {
    const { data: row } = await context.supabase
      .from("code_projects")
      .select("id, bot_id, name, runtime, storage_prefix, created_at, updated_at")
      .eq("owner_id", context.userId)
      .eq("bot_id", data.botId)
      .maybeSingle();
    if (!row) return null;
    return {
      id: row.id,
      botId: row.bot_id,
      name: row.name,
      runtime: row.runtime,
      storagePrefix: row.storage_prefix,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

export const createCodeProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        botId: z.string().min(1).max(64),
        name: z.string().min(1).max(80),
        runtime: z.enum(["javascript", "python"]).default("javascript"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; project?: CodeProject; error?: string }> => {
    const { hasDeveloperAccess } = await import("./roles.functions");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(await hasDeveloperAccess(context as any))) {
      return { ok: false, error: "The Code Editor is limited to Developer accounts." };
    }

    const { data: row, error } = await context.supabase
      .from("code_projects")
      .insert({
        owner_id: context.userId,
        bot_id: data.botId,
        name: data.name,
        runtime: data.runtime,
        storage_prefix: "pending",
      })
      .select("id, bot_id, name, runtime, storage_prefix, created_at, updated_at")
      .single();
    if (error || !row) return { ok: false, error: "Could not create this project." };

    const prefix = `projects/${row.id}`;
    await context.supabase.from("code_projects").update({ storage_prefix: prefix }).eq("id", row.id);

    const starter: Array<{ path: string; body: string }> =
      data.runtime === "python"
        ? [
            { path: CONFIG_FILE, body: JSON.stringify(STARTER_CONFIG, null, 2) },
            { path: "requirements.txt", body: "discord.py>=2.3.0\n" },
            {
              path: "src/main.py",
              body: "import json\n\nwith open('bottly_config.json') as f:\n    config = json.load(f)\n\nprint('Bottly bot starting…')\n",
            },
          ]
        : [
            { path: CONFIG_FILE, body: JSON.stringify(STARTER_CONFIG, null, 2) },
            {
              path: "package.json",
              body: JSON.stringify(
                { name: data.name.toLowerCase().replace(/[^a-z0-9-]+/g, "-"), version: "1.0.0", main: "src/index.js" },
                null,
                2,
              ),
            },
            {
              path: "src/index.js",
              body: "import config from '../bottly_config.json' with { type: 'json' };\n\nconsole.log('Bottly bot starting…', config.version);\n",
            },
          ];

    const storage = await import("./storage/gcs.server");
    try {
      for (const file of starter) {
        await storage.uploadFile(`${prefix}/${file.path}`, file.body, contentTypeFor(file.path));
        await context.supabase.from("code_project_files").insert({
          project_id: row.id,
          path: file.path,
          size: file.body.length,
          content_type: contentTypeFor(file.path),
        });
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Storage is not available." };
    }

    await context.supabase.from("bot_config_schemas").insert({
      project_id: row.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      schema: STARTER_CONFIG as any,
    });

    return {
      ok: true,
      project: {
        id: row.id,
        botId: row.bot_id,
        name: row.name,
        runtime: row.runtime,
        storagePrefix: prefix,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    };
  });

export const listProjectFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => projectIdInput.parse(data))
  .handler(async ({ data, context }): Promise<ProjectFile[]> => {
    await requireOwnedProject(context, data.projectId);
    const { data: rows } = await context.supabase
      .from("code_project_files")
      .select("path, size, content_type, is_folder, updated_at")
      .eq("project_id", data.projectId)
      .order("path");
    return (rows ?? []).map((r) => ({
      path: r.path,
      size: r.size,
      contentType: r.content_type,
      isFolder: r.is_folder,
      updatedAt: r.updated_at,
    }));
  });

export const readProjectFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => projectIdInput.extend({ path: z.string().min(1).max(512) }).parse(data))
  .handler(async ({ data, context }): Promise<{ path: string; content: string }> => {
    const project = await requireOwnedProject(context, data.projectId);
    const storage = await import("./storage/gcs.server");
    const path = storage.normalizePath(data.path);
    const content = await storage.downloadFile(`${project.storage_prefix}/${path}`);
    return { path, content };
  });

export const saveProjectFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    projectIdInput.extend({ path: z.string().min(1).max(512), content: z.string().max(2_000_000) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: true; path: string }> => {
    const project = await requireOwnedProject(context, data.projectId);
    const storage = await import("./storage/gcs.server");
    const path = storage.normalizePath(data.path);
    const contentType = contentTypeFor(path);
    await storage.uploadFile(`${project.storage_prefix}/${path}`, data.content, contentType);
    await context.supabase.from("code_project_files").upsert(
      {
        project_id: data.projectId,
        path,
        size: data.content.length,
        content_type: contentType,
        is_folder: false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "project_id,path" },
    );
    await context.supabase
      .from("code_projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.projectId);

    if (path === CONFIG_FILE) {
      const { validateSchema } = await import("./bot-config");
      try {
        const parsed = validateSchema(JSON.parse(data.content));
        if (parsed.ok && parsed.schema) {
          await context.supabase.from("bot_config_schemas").upsert(
            {
              project_id: data.projectId,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              schema: parsed.schema as any,
            },
            { onConflict: "project_id" },
          );
        }
      } catch {
        // Invalid JSON is kept in storage but not promoted to the schema table.
      }
    }
    return { ok: true, path };
  });

export const createProjectFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => projectIdInput.extend({ path: z.string().min(1).max(512) }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true; path: string }> => {
    const project = await requireOwnedProject(context, data.projectId);
    const storage = await import("./storage/gcs.server");
    const path = storage.normalizePath(data.path);
    await storage.uploadFile(`${project.storage_prefix}/${path}/.keep`, "", "text/plain");
    await context.supabase.from("code_project_files").upsert(
      { project_id: data.projectId, path: `${path}/.keep`, size: 0, content_type: "text/plain", is_folder: false },
      { onConflict: "project_id,path" },
    );
    return { ok: true, path };
  });

export const deleteProjectFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => projectIdInput.extend({ path: z.string().min(1).max(512) }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const project = await requireOwnedProject(context, data.projectId);
    const storage = await import("./storage/gcs.server");
    const path = storage.normalizePath(data.path);
    if (path === CONFIG_FILE) return { ok: false, error: "bottly_config.json cannot be deleted." };

    const { data: rows } = await context.supabase
      .from("code_project_files")
      .select("path")
      .eq("project_id", data.projectId);
    const targets = (rows ?? []).map((r) => r.path).filter((p) => p === path || p.startsWith(`${path}/`));
    for (const target of targets) {
      await storage.deleteFile(`${project.storage_prefix}/${target}`);
      await context.supabase.from("code_project_files").delete().eq("project_id", data.projectId).eq("path", target);
    }
    return { ok: true };
  });

export const moveProjectFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    projectIdInput.extend({ from: z.string().min(1).max(512), to: z.string().min(1).max(512) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const project = await requireOwnedProject(context, data.projectId);
    const storage = await import("./storage/gcs.server");
    const from = storage.normalizePath(data.from);
    const to = storage.normalizePath(data.to);
    if (from === CONFIG_FILE || to === CONFIG_FILE) return { ok: false, error: "bottly_config.json cannot be moved." };
    if (from === to) return { ok: true };

    const { data: rows } = await context.supabase
      .from("code_project_files")
      .select("path, size, content_type")
      .eq("project_id", data.projectId);
    const all = rows ?? [];
    if (all.some((r) => r.path === to)) return { ok: false, error: "A file with that name already exists." };

    const targets = all.filter((r) => r.path === from || r.path.startsWith(`${from}/`));
    if (targets.length === 0) return { ok: false, error: "File not found." };

    for (const target of targets) {
      const nextPath = target.path === from ? to : `${to}${target.path.slice(from.length)}`;
      await storage.moveFile(`${project.storage_prefix}/${target.path}`, `${project.storage_prefix}/${nextPath}`);
      await context.supabase
        .from("code_project_files")
        .update({ path: nextPath, content_type: contentTypeFor(nextPath) })
        .eq("project_id", data.projectId)
        .eq("path", target.path);
    }
    return { ok: true };
  });
