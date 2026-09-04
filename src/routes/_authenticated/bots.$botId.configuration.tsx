import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Settings2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { getBuyerConfiguration, saveBuyerConfiguration } from "@/lib/bot-config.functions";
import type { ConfigSetting, ConfigValue, ValidationIssue } from "@/lib/bot-config";

export const Route = createFileRoute("/_authenticated/bots/$botId/configuration")({
  head: () => ({
    meta: [
      { title: "Bot configuration — Bottly" },
      { name: "description", content: "Personalise the settings of a bot you bought on the Bottly marketplace." },
      { property: "og:title", content: "Bot configuration — Bottly" },
      { property: "og:description", content: "Change the settings the creator made available for your bot." },
    ],
  }),
  component: Page,
});

function Field({
  setting,
  value,
  error,
  onChange,
}: {
  setting: { key: string } & ConfigSetting;
  value: ConfigValue;
  error?: string;
  onChange: (v: ConfigValue) => void;
}) {
  const id = `cfg-${setting.key}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {setting.label}
        {setting.required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {setting.type === "textarea" ? (
        <Textarea id={id} rows={3} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />
      ) : setting.type === "boolean" ? (
        <div className="flex h-9 items-center">
          <Switch id={id} checked={value === true} onCheckedChange={onChange} />
        </div>
      ) : setting.type === "select" ? (
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {(setting.options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : setting.type === "color" ? (
        <div className="flex items-center gap-2">
          <Input
            id={id}
            type="color"
            className="h-9 w-16 p-1"
            value={String(value ?? "#5865F2")}
            onChange={(e) => onChange(e.target.value)}
          />
          <Input
            aria-label={`${setting.label} hex value`}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            className="max-w-32 font-mono text-xs"
          />
        </div>
      ) : (
        <Input
          id={id}
          type={setting.type === "number" ? "number" : "text"}
          placeholder={setting.placeholder ?? ""}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => onChange(setting.type === "number" ? Number(e.target.value) : e.target.value)}
        />
      )}
      {setting.description && <p className="text-xs text-muted-foreground">{setting.description}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Page() {
  const { botId } = Route.useParams();
  const fetchConfig = useServerFn(getBuyerConfiguration);
  const saveConfig = useServerFn(saveBuyerConfiguration);

  const config = useQuery({
    queryKey: ["buyer-config", botId],
    queryFn: () => fetchConfig({ data: { botId } }),
    retry: false,
  });

  const [values, setValues] = useState<Record<string, ConfigValue>>({});
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config.data) setValues(config.data.values);
  }, [config.data]);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await saveConfig({ data: { botId, values } });
      setIssues(res.issues);
      if (res.ok) toast.success("Configuration saved");
      else toast.error(res.error ?? "Please fix the highlighted fields");
    } catch (e) {
      toast.error("Could not save", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Configuration" actions={<span />}>
      <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
        {config.isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" /> Loading configuration…
          </div>
        )}

        {!config.isLoading && !config.data && (
          <EmptyState
            icon={Settings2}
            title="No configuration for this bot"
            description="Only bots bought on the marketplace whose creator published settings can be configured here."
          />
        )}

        {config.data && (
          <>
            <div>
              <h1 className="text-xl font-semibold">{config.data.title}</h1>
              <p className="text-sm text-muted-foreground">
                Change the settings the creator made available. Your values are private to your copy of the bot.
              </p>
            </div>

            {config.data.settings.length === 0 ? (
              <p className="panel p-6 text-center text-sm text-muted-foreground">
                The creator has not exposed any editable settings.
              </p>
            ) : (
              <div className="panel space-y-4 p-5">
                {config.data.settings.map((setting) => (
                  <Field
                    key={setting.key}
                    setting={setting}
                    value={values[setting.key] as ConfigValue}
                    {...(issues.find((i) => i.key === setting.key)
                      ? { error: issues.find((i) => i.key === setting.key)!.message }
                      : {})}
                    onChange={(v) => setValues((prev) => ({ ...prev, [setting.key]: v }))}
                  />
                ))}
                <div className="flex justify-end border-t border-border pt-4">
                  <Button disabled={saving} onClick={() => void submit()}>
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
