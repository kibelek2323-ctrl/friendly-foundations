import { useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import type { BotComponent, BotDesign, Embed, MessageStyle, ThemePreset } from "@/types/bot";
import { THEME_PRESETS } from "@/data/catalog";
import { createEmbed } from "@/data/factories";
import { uid } from "@/lib/id";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColorField } from "@/components/common/ColorField";
import { EmbedEditor } from "@/components/embed/EmbedEditor";
import { DiscordMessagePreview } from "@/components/discord/DiscordMessagePreview";
import { cn } from "@/lib/utils";

export function DesignWorkspace({
  design,
  components,
  onChange,
}: {
  design: BotDesign;
  components: BotComponent[];
  onChange: (patch: Partial<BotDesign>) => void;
}) {
  const [selectedEmbedId, setSelectedEmbedId] = useState<string | null>(design.embeds[0]?.id ?? null);
  const selectedEmbed = design.embeds.find((e) => e.id === selectedEmbedId) ?? design.embeds[0] ?? null;

  const applyPreset = (id: ThemePreset) => {
    const preset = THEME_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    if (id === "custom") {
      onChange({ theme: id });
      return;
    }
    onChange({
      theme: id,
      accentColor: preset.accent,
      embedColor: preset.embed,
      embeds: design.embeds.map((e) => ({ ...e, color: preset.embed })),
    });
  };

  const updateEmbed = (next: Embed) =>
    onChange({ embeds: design.embeds.map((e) => (e.id === next.id ? next : e)) });

  const addEmbed = () => {
    const e = createEmbed({ color: design.embedColor, title: "New embed", description: "" });
    onChange({ embeds: [...design.embeds, e] });
    setSelectedEmbedId(e.id);
  };

  const duplicateEmbed = () => {
    if (!selectedEmbed) return;
    const copy: Embed = {
      ...structuredClone(selectedEmbed),
      id: uid("emb"),
      fields: selectedEmbed.fields.map((f) => ({ ...f, id: uid("fld") })),
    };
    onChange({ embeds: [...design.embeds, copy] });
    setSelectedEmbedId(copy.id);
  };

  const deleteEmbed = () => {
    if (!selectedEmbed) return;
    const next = design.embeds.filter((e) => e.id !== selectedEmbed.id);
    onChange({ embeds: next });
    setSelectedEmbedId(next[0]?.id ?? null);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
      {/* LEFT — editor controls */}
      <section className="panel space-y-5 p-4" aria-label="Design controls">
        <div>
          <h2 className="mb-3 text-sm font-semibold">Identity</h2>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="d-botname">Bot name</Label>
              <Input id="d-botname" value={design.botName} onChange={(e) => onChange({ botName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-avatar">Bot avatar URL</Label>
              <Input
                id="d-avatar"
                value={design.botAvatar}
                placeholder="https://…/avatar.png"
                onChange={(e) => onChange({ botAvatar: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold">Theme</h2>
          <div className="grid grid-cols-2 gap-2">
            {THEME_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                aria-pressed={design.theme === p.id}
                className={cn(
                  "rounded-md border border-border p-2 text-left transition hover:border-primary/60",
                  design.theme === p.id && "border-primary bg-elevated",
                )}
              >
                <span className="mb-1.5 flex gap-1">
                  <span className="size-3 rounded-full" style={{ background: p.accent }} />
                  <span className="size-3 rounded-full" style={{ background: p.embed }} />
                </span>
                <span className="block text-xs font-medium">{p.name}</span>
                <span className="block text-[11px] leading-tight text-muted-foreground">{p.description}</span>
              </button>
            ))}
          </div>
        </div>

        <ColorField id="d-accent" label="Accent color" value={design.accentColor} onChange={(v) => onChange({ accentColor: v, theme: "custom" })} />
        <ColorField
          id="d-embedcolor"
          label="Default embed color"
          value={design.embedColor}
          onChange={(v) => onChange({ embedColor: v, theme: "custom", embeds: design.embeds.map((e) => ({ ...e, color: v })) })}
        />

        <div className="space-y-1.5">
          <Label htmlFor="d-style">Message style</Label>
          <Select value={design.messageStyle} onValueChange={(v) => onChange({ messageStyle: v as MessageStyle })}>
            <SelectTrigger id="d-style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cozy">Cozy</SelectItem>
              <SelectItem value="compact">Compact</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="d-radius">Border radius — {design.borderRadius}px</Label>
          <Slider
            id="d-radius"
            min={0}
            max={20}
            step={1}
            value={[design.borderRadius]}
            onValueChange={([v]) => onChange({ borderRadius: v ?? 8 })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="d-content">Message content</Label>
          <Textarea id="d-content" rows={3} value={design.messageContent} onChange={(e) => onChange({ messageContent: e.target.value })} />
        </div>
      </section>

      {/* CENTER — live preview */}
      <section aria-label="Live Discord preview" className="min-h-[480px]">
        <DiscordMessagePreview
          design={design}
          components={components}
          selectedEmbedId={selectedEmbed?.id ?? null}
          onSelectEmbed={setSelectedEmbedId}
          className="h-full"
        />
      </section>

      {/* RIGHT — selected element settings */}
      <section className="panel p-4" aria-label="Embed settings">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Embed builder</h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" aria-label="Add embed" onClick={addEmbed}>
              <Plus className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Duplicate embed" onClick={duplicateEmbed} disabled={!selectedEmbed}>
              <Copy className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Delete embed" onClick={deleteEmbed} disabled={!selectedEmbed}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>

        {design.embeds.length > 1 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {design.embeds.map((e, i) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setSelectedEmbedId(e.id)}
                aria-pressed={selectedEmbed?.id === e.id}
                className={cn(
                  "rounded-md border border-border px-2 py-1 text-xs",
                  selectedEmbed?.id === e.id && "border-primary bg-elevated",
                )}
              >
                Embed {i + 1}
              </button>
            ))}
          </div>
        )}

        {selectedEmbed ? (
          <EmbedEditor embed={selectedEmbed} onChange={updateEmbed} />
        ) : (
          <p className="text-sm text-muted-foreground">No embeds. Add one to start designing your message.</p>
        )}
      </section>
    </div>
  );
}
