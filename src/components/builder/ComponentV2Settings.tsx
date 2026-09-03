import { Plus, Trash2 } from "lucide-react";
import type { BotComponent, ComponentType, MediaItem } from "@/types/bot";
import { createComponent } from "@/data/factories";
import { uid } from "@/lib/id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CHILD_TYPES: { id: ComponentType; label: string }[] = [
  { id: "text-display", label: "Text display" },
  { id: "section", label: "Section" },
  { id: "media-gallery", label: "Media gallery" },
  { id: "file", label: "File" },
  { id: "separator", label: "Separator" },
  { id: "button", label: "Button" },
  { id: "string-select", label: "String select" },
];

function MediaList({
  items,
  onChange,
  fileMode,
}: {
  items: MediaItem[];
  onChange: (next: MediaItem[]) => void;
  fileMode?: boolean;
}) {
  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.id} className="space-y-1.5 rounded-md border border-border p-2">
          <Input
            aria-label={fileMode ? "File URL" : "Image URL"}
            placeholder="https://…"
            value={it.url}
            onChange={(e) => onChange(items.map((x) => (x.id === it.id ? { ...x, url: e.target.value } : x)))}
          />
          <Input
            aria-label={fileMode ? "File name" : "Alt text"}
            placeholder={fileMode ? "report.pdf" : "Description"}
            value={it.description}
            onChange={(e) => onChange(items.map((x) => (x.id === it.id ? { ...x, description: e.target.value } : x)))}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id={`spoiler-${it.id}`}
                checked={it.spoiler}
                onCheckedChange={(v) => onChange(items.map((x) => (x.id === it.id ? { ...x, spoiler: v } : x)))}
              />
              <Label htmlFor={`spoiler-${it.id}`} className="text-xs">
                Spoiler
              </Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => onChange(items.filter((x) => x.id !== it.id))}
            >
              Remove
            </Button>
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5"
        onClick={() => onChange([...items, { id: uid("media"), url: "", description: "", spoiler: false }])}
      >
        <Plus className="size-4" /> {fileMode ? "Add file" : "Add image"}
      </Button>
    </div>
  );
}

/** Settings editor for Discord Components V2 nodes. */
export function ComponentV2Settings({
  component,
  onPatch,
}: {
  component: BotComponent;
  onPatch: (patch: Partial<BotComponent>) => void;
}) {
  const type = component.type;

  if (type === "text-display" || type === "section") {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="v2-content">Markdown content</Label>
          <Textarea
            id="v2-content"
            rows={5}
            value={component.content ?? ""}
            placeholder="**Bold**, *italic*, `code`, {user}"
            onChange={(e) => onPatch({ content: e.target.value })}
          />
        </div>
        {type === "section" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="v2-accessory">Accessory</Label>
              <Select
                value={component.accessoryKind ?? "thumbnail"}
                onValueChange={(v) => onPatch({ accessoryKind: v as "thumbnail" | "button" })}
              >
                <SelectTrigger id="v2-accessory">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thumbnail">Thumbnail</SelectItem>
                  <SelectItem value="button">Button</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(component.accessoryKind ?? "thumbnail") === "thumbnail" ? (
              <div className="space-y-1.5">
                <Label htmlFor="v2-thumb">Thumbnail URL</Label>
                <Input
                  id="v2-thumb"
                  value={component.accessoryUrl ?? ""}
                  placeholder="https://…"
                  onChange={(e) => onPatch({ accessoryUrl: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="v2-btn-url">Button URL</Label>
                <Input
                  id="v2-btn-url"
                  value={component.url}
                  placeholder="https://…"
                  onChange={(e) => onPatch({ url: e.target.value })}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (type === "media-gallery" || type === "file") {
    return (
      <div className="space-y-2">
        <Label>{type === "file" ? "Files" : "Images"}</Label>
        <MediaList
          items={component.items ?? []}
          fileMode={type === "file"}
          onChange={(items) => onPatch({ items })}
        />
      </div>
    );
  }

  if (type === "separator") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <Label htmlFor="v2-divider" className="text-sm">
            Show divider line
          </Label>
          <Switch
            id="v2-divider"
            checked={component.divider !== false}
            onCheckedChange={(v) => onPatch({ divider: v })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="v2-spacing">Spacing</Label>
          <Select value={component.spacing ?? "small"} onValueChange={(v) => onPatch({ spacing: v as "small" | "large" })}>
            <SelectTrigger id="v2-spacing">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  if (type === "container") {
    const children = component.children ?? [];
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="v2-accent">Accent color</Label>
          <div className="flex gap-2">
            <input
              id="v2-accent"
              type="color"
              value={component.accentColor || "#5865F2"}
              onChange={(e) => onPatch({ accentColor: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded-md border border-border bg-transparent"
            />
            <Input
              aria-label="Accent hex"
              value={component.accentColor || "#5865F2"}
              onChange={(e) => onPatch({ accentColor: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
          <Label htmlFor="v2-spoiler" className="text-sm">
            Spoiler
          </Label>
          <Switch
            id="v2-spoiler"
            checked={Boolean(component.spoiler)}
            onCheckedChange={(v) => onPatch({ spoiler: v })}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Inside the container</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Plus className="size-4" /> Add
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {CHILD_TYPES.map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    onSelect={() => onPatch({ children: [...children, createComponent(t.id)] })}
                  >
                    {t.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {children.length === 0 ? (
            <p className="text-xs text-muted-foreground">Empty container — add text, media or buttons inside.</p>
          ) : (
            <ul className="space-y-2">
              {children.map((child) => (
                <li key={child.id} className="space-y-1.5 rounded-md border border-border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {CHILD_TYPES.find((t) => t.id === child.type)?.label ?? child.type}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove child"
                      onClick={() => onPatch({ children: children.filter((c) => c.id !== child.id) })}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                  {child.type === "text-display" || child.type === "section" ? (
                    <Textarea
                      aria-label="Child content"
                      rows={2}
                      value={child.content ?? ""}
                      onChange={(e) =>
                        onPatch({
                          children: children.map((c) =>
                            c.id === child.id ? { ...c, content: e.target.value } : c,
                          ),
                        })
                      }
                    />
                  ) : child.type === "media-gallery" || child.type === "file" ? (
                    <Input
                      aria-label="Child URL"
                      placeholder="https://…"
                      value={child.items?.[0]?.url ?? ""}
                      onChange={(e) =>
                        onPatch({
                          children: children.map((c) =>
                            c.id === child.id
                              ? {
                                  ...c,
                                  items: [
                                    {
                                      id: c.items?.[0]?.id ?? uid("media"),
                                      url: e.target.value,
                                      description: c.items?.[0]?.description ?? "",
                                      spoiler: c.items?.[0]?.spoiler ?? false,
                                    },
                                  ],
                                }
                              : c,
                          ),
                        })
                      }
                    />
                  ) : child.type === "separator" ? null : (
                    <Input
                      aria-label="Child label"
                      value={child.label}
                      onChange={(e) =>
                        onPatch({
                          children: children.map((c) => (c.id === child.id ? { ...c, label: e.target.value } : c)),
                        })
                      }
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return null;
}
