import { createFileRoute } from "@tanstack/react-router";
import { BotPage } from "@/components/layout/BotPage";
import { ComponentsWorkspace } from "@/components/builder/ComponentsWorkspace";

export const Route = createFileRoute("/_authenticated/bots/$botId/components")({
  head: () => ({
    meta: [
      { title: "Buttons, menus & modals — Bottly" },
      { name: "description", content: "Add interactive Discord components and preview them instantly." },
      { property: "og:title", content: "Buttons, menus & modals — Bottly" },
      { property: "og:description", content: "Add interactive Discord components and preview them instantly." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <BotPage section="Components">
      {(bot, patch) => (
        <ComponentsWorkspace
          design={bot.design}
          components={bot.components}
          onChange={(components) => patch({ components })}
        />
      )}
    </BotPage>
  );
}
