import { createFileRoute } from "@tanstack/react-router";
import { BotPage } from "@/components/layout/BotPage";
import { PresenceWorkspace } from "@/components/builder/PresenceWorkspace";

export const Route = createFileRoute("/_authenticated/bots/$botId/presence")({
  head: () => ({
    meta: [
      { title: "Bot presence & profile — Bottly" },
      { name: "description", content: "Set your bot's name, description, avatar, status and activity with a live Discord profile preview." },
      { property: "og:title", content: "Bot presence & profile — Bottly" },
      { property: "og:description", content: "Set your bot's name, description, avatar, status and activity with a live Discord profile preview." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <BotPage section="Presence">
      {(bot, patch) => <PresenceWorkspace bot={bot} onChange={patch} />}
    </BotPage>
  );
}
