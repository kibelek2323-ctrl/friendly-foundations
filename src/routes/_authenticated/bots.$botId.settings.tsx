import { usePlan } from "@/hooks/usePlan";
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { BotPage } from "@/components/layout/BotPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TIMEZONES } from "@/data/catalog";
import { BotConnectionPanel } from "@/components/bots/BotConnectionPanel";
import { useBotStore } from "@/stores/useBotStore";
import type { BotLanguage } from "@/types/bot";

export const Route = createFileRoute("/_authenticated/bots/$botId/settings")({
  head: () => ({
    meta: [
      { title: "Bot settings — Bottly" },
      { name: "description", content: "Manage identity, token, runtime language and danger-zone actions." },
      { property: "og:title", content: "Bot settings — Bottly" },
      { property: "og:description", content: "Manage identity, token, runtime language and danger-zone actions." },
    ],
  }),
  component: Page,
});

function Page() {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deleteBot = useBotStore((s) => s.deleteBot);
  const { canEditBranding } = usePlan();
  const navigate = useNavigate();

  return (
    <BotPage section="Settings">
      {(bot, patch) => (
        <div className="mx-auto max-w-3xl space-y-4">
          <section className="panel space-y-4 p-5">
            <h2 className="text-sm font-semibold">Identity</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="s-name">Display name</Label>
                <Input id="s-name" value={bot.name} onChange={(e) => patch({ name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-username">Username</Label>
                <Input id="s-username" value={bot.username} onChange={(e) => patch({ username: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-desc">Description</Label>
              <Textarea
                id="s-desc"
                rows={3}
                value={bot.description}
                disabled={!canEditBranding}
                onChange={(e) => patch({ description: e.target.value })}
              />
              {!canEditBranding && (
                <p className="text-[11px] text-muted-foreground">
                  Editing the description and branding requires the Pro plan or higher — redeem a code in Plan &amp;
                  billing.
                </p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="s-lang">Runtime</Label>
                <Select value={bot.language} onValueChange={(v) => patch({ language: v as BotLanguage })}>
                  <SelectTrigger id="s-lang">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="javascript">JavaScript (discord.js)</SelectItem>
                    <SelectItem value="python">Python (discord.py)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-tz">Timezone</Label>
                <Select value={bot.timezone} onValueChange={(v) => patch({ timezone: v })}>
                  <SelectTrigger id="s-tz">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <BotConnectionPanel bot={bot} patch={patch} />

          <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-5">
            <h2 className="text-sm font-semibold text-destructive">Danger zone</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Deleting a bot removes its commands, components, automations and logs.
            </p>
            <Button variant="destructive" className="mt-4" onClick={() => setConfirmDelete(true)}>
              Delete bot
            </Button>
          </section>

          <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {bot.name}?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteBot(bot.id);
                    toast.success(`${bot.name} deleted`);
                    void navigate({ to: "/bots" });
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </BotPage>
  );
}
