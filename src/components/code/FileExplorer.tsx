import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, File as FileIcon, Folder, MoreHorizontal, Trash2, PenLine } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
}

/** Build a folder tree from flat storage paths. */
export function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", isFolder: true, children: [] };
  for (const path of paths) {
    if (path.endsWith("/.keep")) {
      ensureFolder(root, path.slice(0, -"/.keep".length).split("/"));
      continue;
    }
    const parts = path.split("/");
    const fileName = parts.pop()!;
    const parent = ensureFolder(root, parts);
    if (!parent.children.some((c) => c.path === path)) {
      parent.children.push({ name: fileName, path, isFolder: false, children: [] });
    }
  }
  sort(root);
  return root.children;
}

function ensureFolder(root: TreeNode, parts: string[]): TreeNode {
  let current = root;
  const trail: string[] = [];
  for (const part of parts) {
    if (!part) continue;
    trail.push(part);
    const path = trail.join("/");
    let next = current.children.find((c) => c.isFolder && c.path === path);
    if (!next) {
      next = { name: part, path, isFolder: true, children: [] };
      current.children.push(next);
    }
    current = next;
  }
  return current;
}

function sort(node: TreeNode) {
  node.children.sort((a, b) => (a.isFolder === b.isFolder ? a.name.localeCompare(b.name) : a.isFolder ? -1 : 1));
  node.children.forEach(sort);
}

interface Props {
  files: string[];
  activePath: string | null;
  dirtyPaths: Set<string>;
  filter: string;
  onOpen: (path: string) => void;
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
}

export function FileExplorer({ files, activePath, dirtyPaths, filter, onOpen, onRename, onDelete }: Props) {
  const tree = useMemo(() => {
    const visible = filter.trim() ? files.filter((f) => f.toLowerCase().includes(filter.trim().toLowerCase())) : files;
    return buildTree(visible);
  }, [files, filter]);

  if (tree.length === 0) {
    return <p className="px-3 py-6 text-center text-xs text-muted-foreground">No files yet.</p>;
  }

  return (
    <ul className="space-y-0.5 py-1">
      {tree.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          depth={0}
          activePath={activePath}
          dirtyPaths={dirtyPaths}
          openAll={filter.trim().length > 0}
          onOpen={onOpen}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

function TreeItem({
  node,
  depth,
  activePath,
  dirtyPaths,
  openAll,
  onOpen,
  onRename,
  onDelete,
}: {
  node: TreeNode;
  depth: number;
  activePath: string | null;
  dirtyPaths: Set<string>;
  openAll: boolean;
  onOpen: (path: string) => void;
  onRename: (path: string) => void;
  onDelete: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  const expanded = openAll || open;
  const active = activePath === node.path;

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-1 text-sm transition-colors hover:bg-elevated",
          active && "bg-primary/15 text-primary",
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-left"
          onClick={() => (node.isFolder ? setOpen((v) => !v) : onOpen(node.path))}
        >
          {node.isFolder ? (
            <>
              {expanded ? (
                <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
              )}
              <Folder className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </>
          ) : (
            <FileIcon className="ml-[18px] size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="truncate">{node.name}</span>
          {!node.isFolder && dirtyPaths.has(node.path) && (
            <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="Unsaved changes" />
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${node.name}`}
              className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreHorizontal className="size-3.5" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRename(node.path)}>
              <PenLine className="size-4" /> Rename / move
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(node.path)}>
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {node.isFolder && expanded && node.children.length > 0 && (
        <ul className="space-y-0.5">
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              dirtyPaths={dirtyPaths}
              openAll={openAll}
              onOpen={onOpen}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
