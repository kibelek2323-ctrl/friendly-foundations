import { createFileRoute } from "@tanstack/react-router";
import { BuilderShell } from "@/components/flow/BuilderShell";

export const Route = createFileRoute("/_authenticated/builder/$flowId")({
  head: () => ({
    meta: [
      { title: "Edit flow — Bottly Builder" },
      {
        name: "description",
        content: "Edit a saved Discord bot workflow on Bottly's visual canvas with live Discord message previews.",
      },
      { property: "og:title", content: "Edit flow — Bottly Builder" },
      {
        property: "og:description",
        content: "Open a saved Bottly workflow and keep building nodes, branches and embeds visually.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FlowBuilderPage,
});

function FlowBuilderPage() {
  const { flowId } = Route.useParams();
  return <BuilderShell flowId={flowId} />;
}
