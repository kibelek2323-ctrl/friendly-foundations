import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import type { Embed, EmbedField } from "@/types/bot";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ColorField } from "@/components/common/ColorField";
import { createEmbedField } from "@/data/factories";
import { cn } from "@/lib/utils";

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export function EmbedEditor({ embed, onChange }: { embed: Embed; onChange: (next: Embed) => void }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const set = (patch: Partial<Embed>) => onChange({ ...embed, ...patch });

  const setField = (id: string, patch: Partial<EmbedField>) =>
    set({ fields: embed.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) });

  const moveField = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    const list = [...embed.fields];
    const from = list.findIndex((f) => f.id === sourceId);
    const to = list.findIndex((f) => f.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = list.splice(from, 1);
    if (item) list.splice(to, 0, item);
    set({ fields: list });
  };

  return (
    <div className="space-y-4">
      <Accordion type="multiple" defaultValue={["content", "fields"]} className="space-y-2">
        <AccordionItem value="author" className="rounded-md border border-border px-3">
          <AccordionTrigger className="text-sm">Author</AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <Field id={`${embed.id}-author-name`} label="Author name">
              <Input
                id={`${embed.id}-author-name`}
                value={embed.author.name}
                placeholder="Bottly moderation"
                onChange={(e) => set({ author: { ...embed.author, name: e.target.value } })}
              />
            </Field>
            <Field id={`${embed.id}-author-icon`} label="Author icon URL">
              <Input
                id={`${embed.id}-author-icon`}
                value={embed.author.icon}
                placeholder="https://…/icon.png"
                onChange={(e) => set({ author: { ...embed.author, icon: e.target.value } })}
              />
            </Field>
            <Field id={`${embed.id}-author-url`} label="Author URL">
              <Input
                id={`${embed.id}-author-url`}
                value={embed.author.url}
                placeholder="https://bottly.app"
                onChange={(e) => set({ author: { ...embed.author, url: e.target.value } })}
              />
            </Field>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="content" className="rounded-md border border-border px-3">
          <AccordionTrigger className="text-sm">Content</AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <Field id={`${embed.id}-title`} label="Title">
              <Input id={`${embed.id}-title`} value={embed.title} onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <Field id={`${embed.id}-desc`} label="Description">
              <Textarea
                id={`${embed.id}-desc`}
                rows={5}
                value={embed.description}
                onChange={(e) => set({ description: e.target.value })}
              />
              <p className="text-right text-xs text-muted-foreground">{embed.description.length} / 4096</p>
            </Field>
            <Field id={`${embed.id}-url`} label="Title URL">
              <Input
                id={`${embed.id}-url`}
                value={embed.url}
                placeholder="https://bottly.app/docs"
                onChange={(e) => set({ url: e.target.value })}
              />
            </Field>
            <ColorField id={`${embed.id}-color`} label="Embed color" value={embed.color} onChange={(color) => set({ color })} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="media" className="rounded-md border border-border px-3">
          <AccordionTrigger className="text-sm">Media</AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <Field id={`${embed.id}-thumb`} label="Thumbnail URL">
              <Input id={`${embed.id}-thumb`} value={embed.thumbnail} onChange={(e) => set({ thumbnail: e.target.value })} />
            </Field>
            <Field id={`${embed.id}-image`} label="Image URL">
              <Input id={`${embed.id}-image`} value={embed.image} onChange={(e) => set({ image: e.target.value })} />
            </Field>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="fields" className="rounded-md border border-border px-3">
          <AccordionTrigger className="text-sm">Fields ({embed.fields.length})</AccordionTrigger>
          <AccordionContent className="space-y-2 pb-3">
            {embed.fields.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">No fields yet. Fields render as columns inside the embed.</p>
            )}
            {embed.fields.map((f) => (
              <div
                key={f.id}
                draggable
                onDragStart={() => setDragId(f.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId) moveField(dragId, f.id);
                  setDragId(null);
                }}
                className={cn(
                  "space-y-2 rounded-md border border-border bg-elevated/60 p-2.5",
                  dragId === f.id && "opacity-50",
                )}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="size-4 cursor-grab text-muted-foreground" aria-hidden="true" />
                  <Input
                    aria-label="Field name"
                    value={f.name}
                    placeholder="Field name"
                    onChange={(e) => setField(f.id, { name: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete field ${f.name}`}
                    onClick={() => set({ fields: embed.fields.filter((x) => x.id !== f.id) })}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
                <Textarea
                  aria-label="Field value"
                  rows={2}
                  value={f.value}
                  placeholder="Field value"
                  onChange={(e) => setField(f.id, { value: e.target.value })}
                />
                <div className="flex items-center gap-2">
                  <Switch id={`${f.id}-inline`} checked={f.inline} onCheckedChange={(v) => setField(f.id, { inline: v })} />
                  <Label htmlFor={`${f.id}-inline`} className="text-xs text-muted-foreground">
                    Inline
                  </Label>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => set({ fields: [...embed.fields, createEmbedField()] })}>
              <Plus className="size-4" /> Add field
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="footer" className="rounded-md border border-border px-3">
          <AccordionTrigger className="text-sm">Footer</AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            <Field id={`${embed.id}-footer`} label="Footer text">
              <Input
                id={`${embed.id}-footer`}
                value={embed.footer.text}
                onChange={(e) => set({ footer: { ...embed.footer, text: e.target.value } })}
              />
            </Field>
            <Field id={`${embed.id}-footer-icon`} label="Footer icon URL">
              <Input
                id={`${embed.id}-footer-icon`}
                value={embed.footer.icon}
                onChange={(e) => set({ footer: { ...embed.footer, icon: e.target.value } })}
              />
            </Field>
            <div className="flex items-center gap-2">
              <Switch id={`${embed.id}-ts`} checked={embed.timestamp} onCheckedChange={(v) => set({ timestamp: v })} />
              <Label htmlFor={`${embed.id}-ts`} className="text-xs text-muted-foreground">
                Show timestamp
              </Label>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
