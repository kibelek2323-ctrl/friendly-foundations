import { useState } from "react";
import { GripVertical, Plus, Trash2, Copy } from "lucide-react";
import type { BotComponent, BotDesign, ComponentType, SelectOption } from "@/types/bot";
import { BUTTON_STYLES, COMPONENT_TYPES } from "@/data/catalog";
import { createComponent } from "@/data/factories";
import { uid } from "@/lib/id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DiscordMessagePreview } from "@/components/discord/DiscordMessagePreview";
import { ComponentV2Settings } from "@/components/builder/ComponentV2Settings";
import { isV2 } from "@/components/discord/DiscordComponentsV2";
import { EmptyState } from "@/components/common/EmptyState";
import { Puzzle } from "lucide-react";
import { cn } from "@/lib/utils";

export function ComponentsWorkspace({
  design,
  components,
  onChange,
}: {
  design: BotDesign;
  components: BotComponent[];
  onChange: (next: BotComponent[]) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(components[0]?.id ?? null);
  const [dragId, setDragId] = useState<string | null>(null);
  const selected = components.find((c) => c.id === selectedId) ?? null;

  const add = (type: ComponentType) => {
    const c = createComponent(type);
    onChange([...components, c]);
    setSelectedId(c.id);
  };
  const update = (id: string, patch: Partial<BotComponent>) =>
    onChange(components.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (id: string) => {
    onChange(components.filter((c) => c.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const duplicate = (id: string) => {
    const src = components.find((c) => c.id === id);
    if (!src) return;
    const copy: BotComponent = { ...structuredClone(src), id: uid("cmp") };
    onChange([...components, copy]);
    setSelectedId(copy.id);
  };
  const move = (source: string, target: string) => {
    if (source === target) return;
    const list = [...components];
    const from = list.findIndex((c) => c.id === source);
    const to = list.findIndex((c) => c.id === target);
    if (from < 0 || to < 0) return;
    const [item] = list.splice(from, 1);
    if (item) list.splice(to, 0, item);
    onChange(list);
  };

  const groups = Array.from(new Set(COMPONENT_TYPES.map((t) => t.group)));
  const isButton = selected?.type === "button" || selected?.type === "link-button";
  const isSelect = selected?.type.endsWith("select");
  const v2 = selected ? isV2(selected) : false;

  return (
    <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
      <section className="panel flex flex-col p-3" aria-label="Component list">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Components</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus className="size-4" /> Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {groups.map((g) => (
                <div key={g}>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">{g}</DropdownMenuLabel>
                  {COMPONENT_TYPES.filter((t) => t.group === g).map((t) => (
                    <DropdownMenuItem key={t.id} onSelect={() => add(t.id)}>
                      {t.label}
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {components.length === 0 ? (
          <EmptyState
            icon={Puzzle}
            title="No components yet."
            description="Add buttons, selects and modals so members can interact with your bot."
            actionLabel="Add a button"
            onAction={() => add("button")}
          />
        ) : (
          <ul className="space-y-1.5">
            {components.map((c) => (
              <li key={c.id}>
                <div
                  draggable
                  onDragStart={() => setDragId(c.id)}
                  onDragEnd={() => setDragId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragId) move(dragId, c.id);
                    setDragId(null);
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-md border border-border bg-elevated/50 px-2 py-1.5",
                    selectedId === c.id && "border-primary bg-elevated",
                    dragId === c.id && "opacity-50",
                  )}
                >
                  <GripVertical className="size-4 cursor-grab text-muted-foreground" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className="min-w-0 flex-1 text-left"
                    aria-pressed={selectedId === c.id}
                  >
                    <p className="truncate text-sm font-medium">{c.label}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {COMPONENT_TYPES.find((t) => t.id === c.type)?.label}
                    </p>
                  </button>
                  <Button variant="ghost" size="icon" aria-label={`Duplicate ${c.label}`} onClick={() => duplicate(c.id)}>
                    <Copy className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${c.label}`} onClick={() => remove(c.id)}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Preview" className="min-h-[420px]">
        <DiscordMessagePreview
          design={design}
          components={components}
          selectedComponentId={selectedId}
          onSelectComponent={setSelectedId}
          className="h-full"
        />
      </section>

      <section className="panel p-4" aria-label="Component settings">
        <h2 className="mb-3 text-sm font-semibold">Settings</h2>
        {!selected ? (
          <p className="text-sm text-muted-foreground">Select a component to edit its properties.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cmp-label">{v2 ? "Name (editor only)" : "Label"}</Label>
              <Input id="cmp-label" value={selected.label} onChange={(e) => update(selected.id, { label: e.target.value })} />
            </div>

            {v2 && <ComponentV2Settings component={selected} onPatch={(patch) => update(selected.id, patch)} />}

            {isButton && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="cmp-style">Style</Label>
                  <Select value={selected.style} onValueChange={(v) => update(selected.id, { style: v as BotComponent["style"] })}>
                    <SelectTrigger id="cmp-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUTTON_STYLES.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cmp-emoji">Emoji</Label>
                  <Input
                    id="cmp-emoji"
                    value={selected.emoji}
                    placeholder="🎫"
                    onChange={(e) => update(selected.id, { emoji: e.target.value })}
                  />
                </div>
                {selected.type === "link-button" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="cmp-url">URL</Label>
                    <Input id="cmp-url" value={selected.url} onChange={(e) => update(selected.id, { url: e.target.value })} />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="cmp-action">Action ID</Label>
                    <Input
                      id="cmp-action"
                      value={selected.action}
                      placeholder="open_ticket"
                      onChange={(e) => update(selected.id, { action: e.target.value })}
                    />
                  </div>
                )}
              </>
            )}

            {(isSelect || selected.type === "text-input" || selected.type === "modal") && (
              <div className="space-y-1.5">
                <Label htmlFor="cmp-placeholder">Placeholder</Label>
                <Input
                  id="cmp-placeholder"
                  value={selected.placeholder}
                  onChange={(e) => update(selected.id, { placeholder: e.target.value })}
                />
              </div>
            )}

            {selected.type === "string-select" && (
              <div className="space-y-2">
                <Label>Options</Label>
                {selected.options.map((o) => (
                  <div key={o.id} className="space-y-1.5 rounded-md border border-border p-2">
                    <Input
                      aria-label="Option label"
                      value={o.label}
                      onChange={(e) =>
                        update(selected.id, {
                          options: selected.options.map((x) => (x.id === o.id ? { ...x, label: e.target.value } : x)),
                        })
                      }
                    />
                    <Input
                      aria-label="Option description"
                      value={o.description}
                      onChange={(e) =>
                        update(selected.id, {
                          options: selected.options.map((x) => (x.id === o.id ? { ...x, description: e.target.value } : x)),
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-destructive"
                      onClick={() => update(selected.id, { options: selected.options.filter((x) => x.id !== o.id) })}
                    >
                      Remove option
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => {
                    const opt: SelectOption = { id: uid("opt"), label: "New option", description: "", value: "new_option" };
                    update(selected.id, { options: [...selected.options, opt] });
                  }}
                >
                  <Plus className="size-4" /> Add option
                </Button>
              </div>
            )}

            {!v2 && (
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <Label htmlFor="cmp-disabled" className="text-sm">
                Disabled
              </Label>
              <Switch
                id="cmp-disabled"
                checked={selected.disabled}
                onCheckedChange={(v) => update(selected.id, { disabled: v })}
              />
            </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
