import { createFileRoute } from "@tanstack/react-router";
import { BotPage } from "@/components/layout/BotPage";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BotEvent } from "@/types/bot";

export const Route = createFileRoute("/_authenticated/bots/$botId/events")({
  head: () => ({
    meta: [
      { title: "Discord event handlers — Bottly" },
      { name: "description", content: "Toggle welcome, farewell, moderation and reaction events for your bot." },
      { property: "og:title", content: "Discord event handlers — Bottly" },
      { property: "og:description", content: "Toggle welcome, farewell, moderation and reaction events for your bot." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <BotPage section="Events">
      {(bot, patch) => {
        const update = (id: string, p: Partial<BotEvent>) =>
          patch({ events: bot.events.map((e) => (e.id === id ? { ...e, ...p } : e)) });

        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Events run automatically when something happens in your server.
            </p>
            {bot.events.map((ev) => (
              <div key={ev.id} className="panel p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold">{ev.name}</h2>
                    <p className="text-xs text-muted-foreground">{ev.description}</p>
                  </div>
                  <Switch
                    checked={ev.enabled}
                    aria-label={`Toggle ${ev.name}`}
                    onCheckedChange={(v) => update(ev.id, { enabled: v })}
                  />
                </div>
                {ev.enabled && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor={`${ev.id}-channel`}>Channel</Label>
                      <Input
                        id={`${ev.id}-channel`}
                        value={ev.channel}
                        placeholder="#general"
                        onChange={(e) => update(ev.id, { channel: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5 md:row-span-2">
                      <Label htmlFor={`${ev.id}-msg`}>Message</Label>
                      <Textarea
                        id={`${ev.id}-msg`}
                        rows={4}
                        value={ev.message}
                        onChange={(e) => update(ev.id, { message: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }}
    </BotPage>
  );
}
