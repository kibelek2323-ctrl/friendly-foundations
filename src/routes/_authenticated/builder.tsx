import { createFileRoute } from "@tanstack/react-router";
import { BuilderShell } from "@/components/flow/BuilderShell";

export const Route = createFileRoute("/_authenticated/builder")({
  head: () => ({
    meta: [
      { title: "Visual Bot Flow Builder — Bottly" },
      {
        name: "description",
        content:
          "Build Discord bot commands visually: drag nodes onto an infinite canvas, connect logic and preview real Discord embeds live.",
      },
      { property: "og:title", content: "Visual Bot Flow Builder — Bottly" },
      {
        property: "og:description",
        content: "Drag, connect and configure Discord bot workflows with live embed previews — no code required.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BuilderPage,
});

function BuilderPage() {
  return <BuilderShell />;
}
