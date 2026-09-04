import { useState } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CONFIG_TYPES,
  CONFIG_TYPE_LABEL,
  KEY_PATTERN,
  defaultForType,
  type BotConfigSchema,
  type ConfigSetting,
  type ConfigType,
  type ValidationIssue,
} from "@/lib/bot-config";

interface Props {
  schema: BotConfigSchema;
  issues: ValidationIssue[];
  saving: boolean;
  onChange: (schema: BotConfigSchema) => void;
  onSave: () => void;
}

/** Visual editor for bottly_config.json — the settings buyers can change. */
export function ConfigBuilder({ schema, issues, saving, onChange, onSave }: Props) {
  const entries = Object.entries(schema.settings ?? {});
  const [newKey, setNewKey] = useState("");

  const patch = (key: string, next: Partial<ConfigSetting>) => {
    const current = schema.settings[key];
    if (!current) return;
    onChange({ ...schema, settings: { ...schema.settings, [key]: { ...current, ...next } } });
  };

  const rename = (key: string, nextKey: string) => {
    if (!KEY_PATTERN.test(nextKey) || schema.settings[nextKey]) return;
    const next: Record<string, ConfigSetting> = {};
    for (const [k, v] of Object.entries(schema.settings)) next[k === key ? nextKey : k] = v;
    onChange({ ...schema, settings: next });
  };

  const remove = (key: string) => {
    const next = { ...schema.settings };
    delete next[key];
    onChange({ ...schema, settings: next });
  };

  const add = () => {
    const key = newKey.trim() || `setting${entries.length + 1}`;
    if (!KEY_PATTERN.test(key) || schema.settings[key]) return;
    onChange({
      ...schema,
      settings: {
        ...schema.settings,
        [key]: { type: "text", label: key, editable: true, default: "" },
      },
    });
    setNewKey("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Bot Configuration</h2>
          <p className="text-xs text-muted-foreground">
            Settings buyers can change after purchase. Saved into bottly_config.json.
          </p>
        </div>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save configuration"}
        </Button>
      </div>

      {issues.length > 0 && (
        <div className="panel space-y-1 border-destructive/40 bg-destructive/10 p-3 text-xs">
          <p className="flex items-center gap-1.5 font-medium text-destructive">
            <AlertTriangle className="size-3.5" aria-hidden="true" /> Fix these before publishing
          </p>
          {issues.map((i, idx) => (
            <p key={`${i.key}-${idx}`}>
              <span className="font-mono">{i.key}</span>: {i.message}
            </p>
          ))}
        </div>
      )}

      {entries.length === 0 && (
        <p className="panel p-6 text-center text-sm text-muted-foreground">
          No configuration variables yet. Add the first one below.
        </p>
      )}

      <div className="space-y-3">
        {entries.map(([key, setting]) => (
          <div key={key} className="panel space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor={`key-${key}`}>Key</Label>
                <Input
                  id={`key-${key}`}
                  defaultValue={key}
                  onBlur={(e) => rename(key, e.target.value.trim())}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`label-${key}`}>Label</Label>
                <Input id={`label-${key}`} value={setting.label} onChange={(e) => patch(key, { label: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`type-${key}`}>Type</Label>
                <Select
                  value={setting.type}
                  onValueChange={(v) => {
                    const type = v as ConfigType;
                    patch(key, { type, default: defaultForType({ ...setting, type }) });
                  }}
                >
                  <SelectTrigger id={`type-${key}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONFIG_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {CONFIG_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`desc-${key}`}>Description</Label>
                <Input
                  id={`desc-${key}`}
                  value={setting.description ?? ""}
                  onChange={(e) => patch(key, { description: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`default-${key}`}>Default value</Label>
                {setting.type === "boolean" ? (
                  <div className="flex h-9 items-center">
                    <Switch
                      id={`default-${key}`}
                      checked={setting.default === true}
                      onCheckedChange={(v) => patch(key, { default: v })}
                    />
                  </div>
                ) : setting.type === "textarea" ? (
                  <Textarea
                    id={`default-${key}`}
                    rows={2}
                    value={String(setting.default ?? "")}
                    onChange={(e) => patch(key, { default: e.target.value })}
                  />
                ) : (
                  <Input
                    id={`default-${key}`}
                    type={setting.type === "number" ? "number" : setting.type === "color" ? "color" : "text"}
                    value={String(setting.default ?? "")}
                    onChange={(e) =>
                      patch(key, {
                        default: setting.type === "number" ? Number(e.target.value) : e.target.value,
                      })
                    }
                  />
                )}
              </div>
            </div>

            {setting.type === "select" && (
              <div className="space-y-1.5">
                <Label htmlFor={`options-${key}`}>Options (one per line, label|value)</Label>
                <Textarea
                  id={`options-${key}`}
                  rows={3}
                  value={(setting.options ?? []).map((o) => `${o.label}|${o.value}`).join("\n")}
                  onChange={(e) =>
                    patch(key, {
                      options: e.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const [label, value] = line.split("|");
                          return { label: (label ?? "").trim(), value: (value ?? label ?? "").trim() };
                        }),
                    })
                  }
                />
              </div>
            )}

            {setting.type === "number" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`min-${key}`}>Min</Label>
                  <Input
                    id={`min-${key}`}
                    type="number"
                    value={setting.min ?? ""}
                    onChange={(e) => patch(key, { min: e.target.value === "" ? undefined : Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`max-${key}`}>Max</Label>
                  <Input
                    id={`max-${key}`}
                    type="number"
                    value={setting.max ?? ""}
                    onChange={(e) => patch(key, { max: e.target.value === "" ? undefined : Number(e.target.value) })}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-5 border-t border-border pt-3">
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={setting.editable} onCheckedChange={(v) => patch(key, { editable: v })} />
                Editable by buyers
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={setting.internal === true} onCheckedChange={(v) => patch(key, { internal: v })} />
                Internal (never shown to buyers)
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={setting.required === true} onCheckedChange={(v) => patch(key, { required: v })} />
                Required
              </label>
              <Button variant="ghost" size="sm" className="ml-auto text-destructive" onClick={() => remove(key)}>
                <Trash2 className="size-4" /> Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="panel flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-48 flex-1 space-y-1.5">
          <Label htmlFor="new-variable">New variable key</Label>
          <Input
            id="new-variable"
            value={newKey}
            placeholder="welcomeMessage"
            className="font-mono text-xs"
            onChange={(e) => setNewKey(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={add}>
          <Plus className="size-4" /> Add variable
        </Button>
      </div>
    </div>
  );
}
