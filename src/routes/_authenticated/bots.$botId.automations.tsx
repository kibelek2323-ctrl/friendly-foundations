import { createFileRoute } from "@tanstack/react-router";
import { BotPage } from "@/components/layout/BotPage";
import { AutomationsWorkspace } from "@/components/automation/AutomationsWorkspace";

export const Route = createFileRoute("/_authenticated/bots/$botId/automations")({
  head: () => ({
    meta: [
      { title: "Visual automation builder — Bottly" },
      { name: "description", content: "Chain triggers, conditions and actions on a drag-and-drop canvas." },
      { property: "og:title", content: "Visual automation builder — Bottly" },
      { property: "og:description", content: "Chain triggers, conditions and actions on a drag-and-drop canvas." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <BotPage section="Automations">
      {(bot, patch) => (
        <AutomationsWorkspace automations={bot.automations} onChange={(automations) => patch({ automations })} />
      )}
    </BotPage>
  );
}
