import { Download, FileText, ExternalLink, ImageOff } from "lucide-react";
import type { BotComponent, MediaItem } from "@/types/bot";
import { DiscordMarkdown } from "@/components/discord/DiscordMarkdown";
import { cn } from "@/lib/utils";

/** Discord Components V2 renderers — matches the discohook preview layout 1:1. */

export function DiscordTextDisplay({ component }: { component: BotComponent }) {
  const text = component.content ?? "";
  return (
    <DiscordMarkdown
      text={text || "*Empty text display*"}
      className="whitespace-pre-wrap text-[16px] font-normal leading-[22px] text-dc-text"
    />
  );
}

function MediaTile({ item, className }: { item: MediaItem; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[8px] bg-dc-input", className)}>
      {item.url ? (
        <img
          src={item.url}
          alt={item.description || ""}
          loading="lazy"
          className={cn("h-full w-full object-cover", item.spoiler && "blur-xl")}
        />
      ) : (
        <div className="flex h-full min-h-[120px] w-full items-center justify-center text-dc-muted">
          <ImageOff className="size-6" aria-hidden="true" />
        </div>
      )}
      {item.spoiler && item.url && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-black/70 px-3 py-1 text-[12px] font-semibold uppercase text-white">
            Spoiler
          </span>
        </span>
      )}
    </div>
  );
}

export function DiscordMediaGallery({ component }: { component: BotComponent }) {
  const items = component.items ?? [];
  if (items.length === 0) return null;
  const cols = items.length === 1 ? 1 : items.length === 2 || items.length === 4 ? 2 : 3;
  return (
    <div
      className="grid max-w-[550px] gap-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {items.map((item, i) => (
        <MediaTile
          key={item.id}
          item={item}
          className={items.length === 1 ? "max-h-[350px]" : i === 0 && items.length === 3 ? "row-span-2 h-full" : "aspect-square"}
        />
      ))}
    </div>
  );
}

export function DiscordFile({ component }: { component: BotComponent }) {
  const items = component.items?.length ? component.items : [{ id: component.id, url: component.url, description: component.label, spoiler: false }];
  return (
    <div className="flex max-w-[432px] flex-col gap-2">
      {items.map((f) => (
        <div
          key={f.id}
          className="flex items-center gap-3 rounded-[8px] border border-dc-border bg-dc-embed px-3 py-[10px]"
        >
          <FileText className="size-6 shrink-0 text-dc-interactive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium leading-[18px] text-dc-link">
              {f.description || "attachment"}
            </p>
            <p className="text-[12px] leading-4 text-dc-muted">{f.spoiler ? "Spoiler · " : ""}Attachment</p>
          </div>
          <Download className="size-5 shrink-0 text-dc-interactive" aria-hidden="true" />
        </div>
      ))}
    </div>
  );
}

export function DiscordSeparator({ component }: { component: BotComponent }) {
  const large = component.spacing === "large";
  const divider = component.divider !== false;
  return (
    <div style={{ paddingBlock: large ? 12 : 4 }} className="w-full max-w-[550px]">
      {divider ? <div className="h-px w-full bg-white/[0.08]" /> : <div className="h-px w-full" />}
    </div>
  );
}

export function DiscordSection({
  component,
  renderAccessoryButton,
}: {
  component: BotComponent;
  renderAccessoryButton?: (button: BotComponent) => React.ReactNode;
}) {
  const isButton = component.accessoryKind === "button";
  return (
    <div className="flex w-full max-w-[550px] items-center gap-4">
      <div className="min-w-0 flex-1">
        <DiscordMarkdown
          text={component.content || component.label || "*Empty section*"}
          className="whitespace-pre-wrap text-[16px] font-normal leading-[22px] text-dc-text"
        />
      </div>
      {isButton && component.accessory && renderAccessoryButton ? (
        <div className="shrink-0">{renderAccessoryButton(component.accessory)}</div>
      ) : !isButton ? (
        <div className="size-[86px] shrink-0 overflow-hidden rounded-[8px] bg-dc-input">
          {component.accessoryUrl ? (
            <img src={component.accessoryUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-dc-muted">
              <ImageOff className="size-5" aria-hidden="true" />
            </div>
          )}
        </div>
      ) : (
        <a
          href={component.url || "#"}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] bg-dc-grey px-4 text-[14px] font-medium text-white"
        >
          {component.label || "Button"}
          <ExternalLink className="size-4 opacity-80" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

export function DiscordContainer({
  component,
  children,
}: {
  component: BotComponent;
  children: React.ReactNode;
}) {
  return (
    <div className="relative max-w-[550px] overflow-hidden rounded-[8px] border border-white/[0.08] bg-dc-embed">
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: component.accentColor || "#5865F2" }}
        aria-hidden="true"
      />
      <div className={cn("flex flex-col gap-2 py-4 pl-5 pr-4", component.spoiler && "blur-sm")}>{children}</div>
    </div>
  );
}

export const V2_TYPES: BotComponent["type"][] = [
  "text-display",
  "section",
  "media-gallery",
  "file",
  "separator",
  "container",
];

export function isV2(component: BotComponent) {
  return V2_TYPES.includes(component.type);
}
