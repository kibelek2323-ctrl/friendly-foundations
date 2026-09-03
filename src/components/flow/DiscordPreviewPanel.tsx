import { useMemo } from "react";
import { MessageSquareDashed } from "lucide-react";
import { DiscordMessagePreview } from "@/components/discord/DiscordMessagePreview";
import { getNodeDef } from "@/data/node-catalog";
import type { BotDesign } from "@/types/bot";
import type { FlowNode } from "@/types/flow";

export function DiscordPreviewPanel({ nodes, selected }: { nodes: FlowNode[]; selected: FlowNode | undefined }) {
  const target = useMemo(() => {
    const isRenderable = (n: FlowNode) => {
      const def = getNodeDef(n.data.type);
      return def.hasEmbed || def.hasComponents;
    };
    if (selected && isRenderable(selected)) return selected;
    return nodes.find(isRenderable);
  }, [nodes, selected]);

  if (!target) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#18191C] px-6 text-center">
        <MessageSquareDashed className="size-5 text-[#4E5058]" aria-hidden="true" />
        <p className="text-[13px] text-[#B5BAC1]">
          Add a message, embed or component node to see the live Discord preview.
        </p>
      </div>
    );
  }

  const messageType = target.data.messageType ?? "embed";
  const showEmbed = messageType === "embed";

  const design: BotDesign = {
    theme: "discord-dark",
    accentColor: "#5865F2",
    embedColor: target.data.embed?.color ?? "#5865F2",
    font: "gg sans",
    borderRadius: 4,
    botName: "Bottly Bot",
    botAvatar: "",
    messageStyle: "cozy",
    messageContent: String(target.data.config["content"] ?? ""),
    embeds: showEmbed && target.data.embed ? [target.data.embed] : [],
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#18191C] p-3">
      <DiscordMessagePreview
        design={design}
        components={showEmbed ? [] : (target.data.components ?? [])}
        channelName={String(target.data.config["channel"] ?? "general").replace(/^#/, "")}
        className="min-h-0 flex-1"
      />
    </div>
  );
}
