import { createFileRoute } from "@tanstack/react-router";
import { BotPage } from "@/components/layout/BotPage";
import { CommandsWorkspace } from "@/components/commands/CommandsWorkspace";

export const Route = createFileRoute("/_authenticated/bots/$botId/commands")({
  head: () => ({
    meta: [
      { title: "Slash commands builder — Bottly" },
      { name: "description", content: "Create slash commands with options, permissions and rich responses." },
      { property: "og:title", content: "Slash commands builder — Bottly" },
      { property: "og:description", content: "Create slash commands with options, permissions and rich responses." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <BotPage section="Commands">
      {(bot, patch) => <CommandsWorkspace commands={bot.commands} onChange={(commands) => patch({ commands })} />}
    </BotPage>
  );
}
