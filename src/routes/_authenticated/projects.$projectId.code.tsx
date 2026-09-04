import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import Editor from "@monaco-editor/react";
import { toast } from "sonner";
import { AlertTriangle, FilePlus2, FolderPlus, Loader2, Save, Search, Upload, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileExplorer } from "@/components/code/FileExplorer";
import { ConfigBuilder } from "@/components/code/ConfigBuilder";
import {
  CONFIG_FILE,
  deleteProjectFile,
  createProjectFolder,
  listProjectFiles,
  moveProjectFile,
  readProjectFile,
  saveProjectFile,
  listMyProjects,
} from "@/lib/code-projects.functions";
import { getConfigSchema, saveConfigSchema, validateProjectForPublish } from "@/lib/bot-config.functions";
import { EMPTY_SCHEMA, validateSchema, type BotConfigSchema, type ValidationIssue } from "@/lib/bot-config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/projects/$projectId/code")({
  head: () => ({
    meta: [
      { title: "Code Editor — Bottly" },
      { name: "description", content: "Write, organise and save your Discord bot source files in Bottly Storage." },
      { property: "og:title", content: "Code Editor — Bottly" },
      { property: "og:description", content: "Write and manage the source code of your Bottly bot project." },
    ],
  }),
  component: Page,
});

function languageFor(path: string): string {
  if (/\.tsx?$/.test(path)) return "typescript";
  if (/\.jsx?$/.test(path)) return "javascript";
  if (/\.json$/.test(path)) return "json";
  if (/\.md$/.test(path)) return "markdown";
  if (/\.py$/.test(path)) return "python";
  if (/\.css$/.test(path)) return "css";
  if (/\.html?$/.test(path)) return "html";
  return "plaintext";
}

interface OpenTab {
  path: string;
  content: string;
  saved: string;
}

function Page() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();

  const fetchProjects = useServerFn(listMyProjects);
  const fetchFiles = useServerFn(listProjectFiles);
  const fetchFile = useServerFn(readProjectFile);
  const saveFile = useServerFn(saveProjectFile);
  const removeFile = useServerFn(deleteProjectFile);
  const moveFile = useServerFn(moveProjectFile);
  const makeFolder = useServerFn(createProjectFolder);
  const fetchSchema = useServerFn(getConfigSchema);
  const storeSchema = useServerFn(saveConfigSchema);
  const validatePublish = useServerFn(validateProjectForPublish);

  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [schema, setSchema] = useState<BotConfigSchema>(EMPTY_SCHEMA);
  const [schemaIssues, setSchemaIssues] = useState<ValidationIssue[]>([]);
  const [dialog, setDialog] = useState<null | { kind: "file" | "folder" | "rename"; value: string; from?: string }>(
    null,
  );
  const uploadRef = useRef<HTMLInputElement>(null);

  const projects = useQuery({ queryKey: ["code-projects"], queryFn: () => fetchProjects() });
  const project = projects.data?.find((p) => p.id === projectId);

  const filesQuery = useQuery({
    queryKey: ["project-files", projectId],
    queryFn: () => fetchFiles({ data: { projectId } }),
    retry: false,
  });

  const schemaQuery = useQuery({
    queryKey: ["project-schema", projectId],
    queryFn: () => fetchSchema({ data: { projectId } }),
    retry: false,
  });

  useEffect(() => {
    if (schemaQuery.data) setSchema(schemaQuery.data);
  }, [schemaQuery.data]);

  const paths = useMemo(() => (filesQuery.data ?? []).map((f) => f.path), [filesQuery.data]);
  const dirty = useMemo(() => new Set(tabs.filter((t) => t.content !== t.saved).map((t) => t.path)), [tabs]);
  const current = tabs.find((t) => t.path === active) ?? null;

  const openFile = useCallback(
    async (path: string) => {
      if (tabs.some((t) => t.path === path)) {
        setActive(path);
        return;
      }
      try {
        const file = await fetchFile({ data: { projectId, path } });
        setTabs((prev) => [...prev, { path, content: file.content, saved: file.content }]);
        setActive(path);
      } catch (e) {
        toast.error("Could not open file", { description: e instanceof Error ? e.message : "Unknown error" });
      }
    },
    [fetchFile, projectId, tabs],
  );

  const persist = useCallback(async () => {
    if (!current || current.content === current.saved) return;
    setBusy(true);
    try {
      await saveFile({ data: { projectId, path: current.path, content: current.content } });
      setTabs((prev) => prev.map((t) => (t.path === current.path ? { ...t, saved: t.content } : t)));
      void queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
      if (current.path === CONFIG_FILE) void queryClient.invalidateQueries({ queryKey: ["project-schema", projectId] });
      toast.success("Saved");
    } catch (e) {
      toast.error("Could not save file", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  }, [current, projectId, queryClient, saveFile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void persist();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [persist]);

  const submitDialog = async () => {
    if (!dialog) return;
    const value = dialog.value.trim();
    if (!value) return;
    setBusy(true);
    try {
      if (dialog.kind === "file") {
        await saveFile({ data: { projectId, path: value, content: "" } });
        setTabs((prev) => [...prev, { path: value, content: "", saved: "" }]);
        setActive(value);
      } else if (dialog.kind === "folder") {
        await makeFolder({ data: { projectId, path: value } });
      } else if (dialog.kind === "rename" && dialog.from) {
        const res = await moveFile({ data: { projectId, from: dialog.from, to: value } });
        if (!res.ok) throw new Error(res.error ?? "Could not move file.");
        setTabs((prev) => prev.map((t) => (t.path === dialog.from ? { ...t, path: value } : t)));
        setActive((a) => (a === dialog.from ? value : a));
      }
      void queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
      setDialog(null);
    } catch (e) {
      toast.error("Action failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (path: string) => {
    if (!window.confirm(`Delete ${path}?`)) return;
    setBusy(true);
    try {
      const res = await removeFile({ data: { projectId, path } });
      if (!res.ok) throw new Error(res.error ?? "Could not delete.");
      setTabs((prev) => prev.filter((t) => t.path !== path && !t.path.startsWith(`${path}/`)));
      setActive((a) => (a === path ? null : a));
      void queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
    } catch (e) {
      toast.error("Could not delete", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  };

  const onUpload = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      await saveFile({ data: { projectId, path: file.name, content: text } });
      void queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
      toast.success(`Uploaded ${file.name}`);
    } catch (e) {
      toast.error("Upload failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  };

  const saveSchema = async () => {
    setBusy(true);
    try {
      const local = validateSchema(schema);
      if (!local.ok) {
        setSchemaIssues(local.issues);
        return;
      }
      const res = await storeSchema({ data: { projectId, schema } });
      setSchemaIssues(res.issues);
      if (res.ok) {
        toast.success("Configuration saved");
        setTabs((prev) => prev.filter((t) => t.path !== CONFIG_FILE));
        void queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
      }
    } catch (e) {
      toast.error("Could not save configuration", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setBusy(false);
    }
  };

  const runPublishCheck = async () => {
    const res = await validatePublish({ data: { projectId } });
    setSchemaIssues(res.issues);
    if (res.ok) toast.success("This project is ready to publish");
    else toast.error("Project is not ready", { description: `${res.issues.length} issue(s) found.` });
  };

  const forbidden = filesQuery.isError;

  return (
    <AppShell title="Code Editor" actions={<span />}>
      <div className="mx-auto max-w-[1600px] space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{project?.name ?? "Project"}</h1>
            <p className="text-sm text-muted-foreground">Files are stored in Bottly Storage Center.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void runPublishCheck()}>
            Check publish readiness
          </Button>
        </div>

        {forbidden && (
          <div className="panel flex items-center gap-3 border-destructive/40 bg-destructive/10 p-4 text-sm">
            <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
            {String((filesQuery.error as Error)?.message ?? "").includes("Forbidden")
              ? "The Code Editor is available to Developer accounts that own this project."
              : "Could not load this project's files."}
          </div>
        )}

        {!forbidden && (
          <Tabs defaultValue="code">
            <TabsList>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="config">Bot Configuration</TabsTrigger>
            </TabsList>

            <TabsContent value="code" className="mt-4">
              <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                <aside className="panel flex h-[70vh] flex-col overflow-hidden">
                  <div className="flex items-center gap-1 border-b border-border p-2">
                    <div className="relative min-w-0 flex-1">
                      <Search
                        className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder="Search files"
                        className="h-8 pl-7 text-xs"
                        aria-label="Search files"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="New file"
                      onClick={() => setDialog({ kind: "file", value: "" })}
                    >
                      <FilePlus2 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="New folder"
                      onClick={() => setDialog({ kind: "folder", value: "" })}
                    >
                      <FolderPlus className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Upload file"
                      onClick={() => uploadRef.current?.click()}
                    >
                      <Upload className="size-4" />
                    </Button>
                    <input
                      ref={uploadRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void onUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto">
                    {filesQuery.isLoading ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading files…
                      </div>
                    ) : (
                      <FileExplorer
                        files={paths}
                        activePath={active}
                        dirtyPaths={dirty}
                        filter={filter}
                        onOpen={(p) => void openFile(p)}
                        onRename={(p) => setDialog({ kind: "rename", value: p, from: p })}
                        onDelete={(p) => void onDelete(p)}
                      />
                    )}
                  </div>
                </aside>

                <section className="panel flex h-[70vh] flex-col overflow-hidden">
                  <div className="flex items-center gap-1 overflow-x-auto border-b border-border p-1.5">
                    {tabs.map((tab) => (
                      <div
                        key={tab.path}
                        className={cn(
                          "flex shrink-0 items-center gap-1 rounded-md border border-transparent px-2 py-1 text-xs",
                          active === tab.path ? "border-border bg-elevated" : "text-muted-foreground",
                        )}
                      >
                        <button type="button" onClick={() => setActive(tab.path)}>
                          {tab.path.split("/").pop()}
                          {tab.content !== tab.saved && " •"}
                        </button>
                        <button
                          type="button"
                          aria-label={`Close ${tab.path}`}
                          onClick={() => {
                            setTabs((prev) => prev.filter((t) => t.path !== tab.path));
                            setActive((a) => (a === tab.path ? null : a));
                          }}
                        >
                          <X className="size-3" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                    <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
                      {current && current.content !== current.saved && (
                        <span className="text-[10px] text-muted-foreground">Unsaved changes</span>
                      )}
                      <Button size="sm" disabled={!current || busy || current.content === current.saved} onClick={() => void persist()}>
                        <Save className="size-4" /> Save
                      </Button>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1">
                    {current ? (
                      <Editor
                        height="100%"
                        theme="vs-dark"
                        path={current.path}
                        language={languageFor(current.path)}
                        value={current.content}
                        onChange={(value) =>
                          setTabs((prev) =>
                            prev.map((t) => (t.path === current.path ? { ...t, content: value ?? "" } : t)),
                          )
                        }
                        options={{
                          fontSize: 13,
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          tabSize: 2,
                          automaticLayout: true,
                        }}
                        loading={
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading editor…
                          </div>
                        }
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                        Select a file on the left to start editing.
                      </div>
                    )}
                  </div>
                </section>
              </div>
            </TabsContent>

            <TabsContent value="config" className="mt-4">
              <ConfigBuilder
                schema={schema}
                issues={schemaIssues}
                saving={busy}
                onChange={setSchema}
                onSave={() => void saveSchema()}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Prefer raw JSON? Open <span className="font-mono">{CONFIG_FILE}</span> in the Code tab — both views stay
                in sync.
              </p>
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.kind === "file" ? "New file" : dialog?.kind === "folder" ? "New folder" : "Rename or move"}
            </DialogTitle>
            <DialogDescription>Use a path relative to the project root, e.g. src/commands/ping.js</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="dialog-path">Path</Label>
            <Input
              id="dialog-path"
              value={dialog?.value ?? ""}
              className="font-mono text-xs"
              onChange={(e) => setDialog((d) => (d ? { ...d, value: e.target.value } : d))}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitDialog();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button disabled={busy} onClick={() => void submitDialog()}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
