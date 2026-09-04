import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronRight, Code2, HardDrive, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { FileExplorer } from "@/components/code/FileExplorer";
import { listMyProjects, listProjectFiles } from "@/lib/code-projects.functions";

export const Route = createFileRoute("/_authenticated/storage")({
  head: () => ({
    meta: [
      { title: "Storage Center — Bottly" },
      { name: "description", content: "Browse every file of your Bottly code projects in one place." },
      { property: "og:title", content: "Storage Center — Bottly" },
      { property: "og:description", content: "One home for all the source files behind your Bottly bots." },
    ],
  }),
  component: Page,
});

function ProjectFiles({ projectId }: { projectId: string }) {
  const fetchFiles = useServerFn(listProjectFiles);
  const files = useQuery({
    queryKey: ["project-files", projectId],
    queryFn: () => fetchFiles({ data: { projectId } }),
    retry: false,
  });

  if (files.isLoading) {
    return (
      <p className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading files…
      </p>
    );
  }
  if (files.isError) return <p className="px-3 py-4 text-xs text-destructive">Could not load these files.</p>;

  return (
    <FileExplorer
      files={(files.data ?? []).map((f) => f.path)}
      activePath={null}
      dirtyPaths={new Set()}
      filter=""
      onOpen={() => undefined}
      onRename={() => undefined}
      onDelete={() => undefined}
    />
  );
}

function Page() {
  const fetchProjects = useServerFn(listMyProjects);
  const projects = useQuery({ queryKey: ["code-projects"], queryFn: () => fetchProjects() });
  const [open, setOpen] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <AppShell title="Storage Center" actions={<span />}>
      <div className="mx-auto max-w-[1200px] space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-xl font-semibold">Storage Center</h1>
          <p className="text-sm text-muted-foreground">
            Every file of your code projects, stored securely in Bottly cloud storage.
          </p>
        </div>

        {projects.isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Loading projects…
          </div>
        )}

        {!projects.isLoading && (projects.data ?? []).length === 0 && (
          <EmptyState
            icon={HardDrive}
            title="No code projects yet"
            description="Create a bot with the Code Editor to start storing files here."
            actionLabel="Create a bot"
            onAction={() => navigate({ to: "/bots/new" })}
          />
        )}

        <div className="space-y-3">
          {(projects.data ?? []).map((project) => {
            const expanded = open === project.id;
            return (
              <div key={project.id} className="panel overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => setOpen(expanded ? null : project.id)}
                    aria-expanded={expanded}
                  >
                    {expanded ? (
                      <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
                    )}
                    <span className="truncate text-sm font-semibold">{project.name}</span>
                    <span className="text-xs text-muted-foreground">{project.runtime}</span>
                  </button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/projects/$projectId/code" params={{ projectId: project.id }}>
                      <Code2 className="size-4" /> Open editor
                    </Link>
                  </Button>
                </div>
                {expanded && <div className="border-t border-border">{<ProjectFiles projectId={project.id} />}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
