import { useState } from "react";
import { GripVertical, Plus, Trash2, Copy, ChevronRight } from "lucide-react";
import type { BotComponent, ComponentType } from "@/types/bot";
import { createComponent } from "@/data/factories";
import { uid } from "@/lib/id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ComponentV2Settings } from "@/components/builder/ComponentV2Settings";
import { isV2 } from "@/components/discord/DiscordComponentsV2";
import { cn } from "@/lib/utils";

const TOP_TYPES: { id: ComponentType; label: string }[] = [
  { id: "container", label: "Container" },
  { id: "text-display", label: "Text display" },
  { id: "section", label: "Section" },
  { id: "media-gallery", label: "Media gallery" },
  { id: "file", label: "File" },
  { id: "separator", label: "Separator" },
  { id: "action-row", label: "Action row" },
];

const ROW_TYPES: { id: ComponentType; label: string }[] = [
  { id: "button", label: "Button" },
  { id: "link-button", label: "Link button" },
  { id: "string-select", label: "String select" },
  { id: "user-select", label: "User select" },
  { id: "role-select", label: "Role select" },
  { id: "channel-select", label: "Channel select" },
  { id: "mentionable-select", label: "Mentionable select" },
];

const CONTAINER_TYPES = TOP_TYPES.filter((t) => t.id !== "container");

const STYLES = ["primary", "secondary", "success", "danger", "link"] as const;

const LABELS: Partial<Record<ComponentType, string>> = Object.fromEntries(
  [...TOP_TYPES, ...ROW_TYPES].map((t) => [t.id, t.label]),
);

function canNest(type: ComponentType) {
  return type === "container" || type === "action-row";
}

/** Recursively map over a component tree. */
function mapTree(list: BotComponent[], fn: (c: BotComponent) => BotComponent | null): BotComponent[] {
  return list.flatMap((c) => {
    const next = fn(c);
    if (!next) return [];
    const children = next.children ? mapTree(next.children, fn) : undefined;
    return [children ? { ...next, children } : next];
  });
}

function findIn(list: BotComponent[], id: string): BotComponent | null {
  for (const c of list) {
    if (c.id === id) return c;
    const nested = c.children ? findIn(c.children, id) : null;
    if (nested) return nested;
  }
  return null;
}

function cloneComponent(c: BotComponent): BotComponent {
  const copy: BotComponent = { ...structuredClone(c), id: uid("cmp") };
  if (copy.children) copy.children = copy.children.map(cloneComponent);
  return copy;
}

/** Insert `item` after `siblingId` (or at the end of `parentId`'s children). */
function insertInto(list: BotComponent[], parentId: string | null, item: BotComponent): BotComponent[] {
  if (parentId === null) return [...list, item];
  return list.map((c) =>
    c.id === parentId
      ? { ...c, children: [...(c.children ?? []), item] }
      : c.children
        ? { ...c, children: insertInto(c.children, parentId, item) }
        : c,
  );
}

function reorderSiblings(list: BotComponent[], sourceId: string, targetId: string): BotComponent[] {
  const iS = list.findIndex((c) => c.id === sourceId);
  const iT = list.findIndex((c) => c.id === targetId);
  if (iS >= 0 && iT >= 0) {
    const next = [...list];
    const [item] = next.splice(iS, 1);
    if (item) next.splice(iT, 0, item);
    return next;
  }
  return list.map((c) => (c.children ? { ...c, children: reorderSiblings(c.children, sourceId, targetId) } : c));
}

export function ComponentsV2Builder({
  components,
  onChange,
  compact,
}: {
  components: BotComponent[];
  onChange: (next: BotComponent[]) => void;
  /** Dense dark styling for the flow builder inspector. */
  compact?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(components[0]?.id ?? null);
  const [dragId, setDragId] = useState<string | null>(null);
  const selected = selectedId ? findIn(components, selectedId) : null;

  const add = (type: ComponentType, parentId: string | null) => {
    const created = createComponent(type);
    onChange(insertInto(components, parentId, created));
    setSelectedId(created.id);
  };
  const patch = (id: string, p: Partial<BotComponent>) =>
    onChange(mapTree(components, (c) => (c.id === id ? { ...c, ...p } : c)));
  const remove = (id: string) => {
    onChange(mapTree(components, (c) => (c.id === id ? null : c)));
    if (selectedId === id) setSelectedId(null);
  };
  const duplicate = (id: string) => {
    const src = findIn(components, id);
    if (!src) return;
    const copy = cloneComponent(src);
    // Insert next to the original inside its own parent.
    const place = (list: BotComponent[]): BotComponent[] => {
      const i = list.findIndex((c) => c.id === id);
      if (i >= 0) {
        const next = [...list];
        next.splice(i + 1, 0, copy);
        return next;
      }
      return list.map((c) => (c.children ? { ...c, children: place(c.children) } : c));
    };
    onChange(place(components));
    setSelectedId(copy.id);
  };

  const AddMenu = ({
    types,
    parentId,
    label,
    size = "sm",
  }: {
    types: { id: ComponentType; label: string }[];
    parentId: string | null;
    label: string;
    size?: "sm" | "xs";
  }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn("gap-1.5", size === "xs" && "h-7 px-2 text-[11px]")}
        >
          <Plus className={size === "xs" ? "size-3.5" : "size-4"} aria-hidden="true" /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Add component</DropdownMenuLabel>
        {types.map((t) => (
          <DropdownMenuItem key={t.id} onSelect={() => add(t.id, parentId)}>
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const Row = ({ c, depth }: { c: BotComponent; depth: number }) => (
    <li>
      <div
        draggable
        onDragStart={() => setDragId(c.id)}
        onDragEnd={() => setDragId(null)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (dragId && dragId !== c.id) onChange(reorderSiblings(components, dragId, c.id));
          setDragId(null);
        }}
        style={{ marginLeft: depth * 12 }}
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-2 py-1.5",
          compact ? "border-white/8 bg-[#1E1F22]" : "border-border bg-elevated/50",
          selectedId === c.id && (compact ? "border-[#5865F2]" : "border-primary bg-elevated"),
          dragId === c.id && "opacity-50",
        )}
      >
        <GripVertical className="size-3.5 shrink-0 cursor-grab text-muted-foreground" aria-hidden="true" />
        <button type="button" onClick={() => setSelectedId(c.id)} className="min-w-0 flex-1 text-left" aria-pressed={selectedId === c.id}>
          <p className="truncate text-[12px] font-medium">{LABELS[c.type] ?? c.type}</p>
          <p className="truncate text-[11px] text-muted-foreground">{c.content || c.label || "—"}</p>
        </button>
        <Button variant="ghost" size="icon" className="size-7" aria-label={`Duplicate ${c.label}`} onClick={() => duplicate(c.id)}>
          <Copy className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="size-7" aria-label={`Delete ${c.label}`} onClick={() => remove(c.id)}>
          <Trash2 className="size-3.5 text-destructive" />
        </Button>
      </div>

      {canNest(c.type) && (
        <ul className="mt-1.5 space-y-1.5">
          {(c.children ?? []).map((child) => (
            <Row key={child.id} c={child} depth={depth + 1} />
          ))}
          <li style={{ marginLeft: (depth + 1) * 12 }} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ChevronRight className="size-3" aria-hidden="true" />
            <AddMenu
              size="xs"
              parentId={c.id}
              label={c.type === "action-row" ? "Add to row" : "Add inside"}
              types={c.type === "action-row" ? ROW_TYPES : CONTAINER_TYPES}
            />
          </li>
        </ul>
      )}
    </li>
  );

  const isButton = selected?.type === "button" || selected?.type === "link-button";
  const isSelect = Boolean(selected?.type.endsWith("select"));

  return (
    <div className={cn("space-y-3", compact && "text-[12px]")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Components V2</p>
        <AddMenu types={TOP_TYPES} parentId={null} label="Add component" />
      </div>

      {components.length === 0 ? (
        <p className="rounded-md border border-dashed border-white/10 p-4 text-center text-[12px] text-muted-foreground">
          This message has no components yet. Start with a Container or a Text display.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {components.map((c) => (
            <Row key={c.id} c={c} depth={0} />
          ))}
        </ul>
      )}

      {selected && (
        <div className={cn("space-y-3 rounded-md border p-3", compact ? "border-white/8 bg-[#1E1F22]" : "border-border bg-elevated/40")}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {LABELS[selected.type] ?? selected.type} settings
          </p>

          {isV2(selected) ? (
            <ComponentV2Settings component={selected} onPatch={(p) => patch(selected.id, p)} />
          ) : isButton ? (
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor="v2-btn-label">Label</Label>
                <Input id="v2-btn-label" value={selected.label} onChange={(e) => patch(selected.id, { label: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  aria-label="Emoji"
                  placeholder="Emoji"
                  value={selected.emoji}
                  onChange={(e) => patch(selected.id, { emoji: e.target.value })}
                />
                <Select value={selected.style} onValueChange={(v) => patch(selected.id, { style: v as BotComponent["style"] })}>
                  <SelectTrigger aria-label="Button style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selected.type === "link-button" || selected.style === "link" ? (
                <Input
                  aria-label="Link URL"
                  placeholder="https://…"
                  value={selected.url}
                  onChange={(e) => patch(selected.id, { url: e.target.value })}
                />
              ) : (
                <Input
                  aria-label="Action ID"
                  placeholder="open_ticket"
                  value={selected.action}
                  onChange={(e) => patch(selected.id, { action: e.target.value })}
                />
              )}
            </div>
          ) : isSelect ? (
            <div className="space-y-2">
              <Input
                aria-label="Placeholder"
                placeholder="Placeholder"
                value={selected.placeholder}
                onChange={(e) => patch(selected.id, { placeholder: e.target.value })}
              />
              {selected.type === "string-select" && (
                <div className="space-y-1.5">
                  {selected.options.map((o) => (
                    <div key={o.id} className="flex items-center gap-1.5">
                      <Input
                        aria-label="Option label"
                        value={o.label}
                        onChange={(e) =>
                          patch(selected.id, {
                            options: selected.options.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)),
                          })
                        }
                      />
                      <Input
                        aria-label="Option description"
                        placeholder="Description"
                        value={o.description}
                        onChange={(e) =>
                          patch(selected.id, {
                            options: selected.options.map((x) =>
                              x.id === o.id ? { ...x, description: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove option"
                        onClick={() =>
                          patch(selected.id, { options: selected.options.filter((x) => x.id !== o.id) })
                        }
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() =>
                      patch(selected.id, {
                        options: [
                          ...selected.options,
                          { id: uid("opt"), label: "New option", description: "", value: "option" },
                        ],
                      })
                    }
                  >
                    <Plus className="size-3.5" /> Add option
                  </Button>
                </div>
              )}
            </div>
          ) : selected.type === "action-row" ? (
            <p className="text-[12px] text-muted-foreground">
              Action rows hold up to 5 buttons or a single select menu. Add them from the list above.
            </p>
          ) : (
            <p className="text-[12px] text-muted-foreground">No extra settings for this component.</p>
          )}
        </div>
      )}
    </div>
  );
}
