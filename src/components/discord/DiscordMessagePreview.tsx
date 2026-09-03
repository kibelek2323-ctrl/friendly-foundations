import { Fragment } from "react";
import { ChevronDown, ExternalLink, Hash, Users } from "lucide-react";
import type { Bot, BotComponent, BotDesign, Embed, EmbedField } from "@/types/bot";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/id";
import { DiscordMarkdown } from "@/components/discord/DiscordMarkdown";
import {
  DiscordContainer,
  DiscordFile,
  DiscordMediaGallery,
  DiscordSection,
  DiscordSeparator,
  DiscordTextDisplay,
} from "@/components/discord/DiscordComponentsV2";

function nowLabel() {
  return "Today at 14:32";
}

function BotAvatar({ src, name, accent, size = 40 }: { src?: string; name: string; accent: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white"
      style={{ width: size, height: size, background: src ? undefined : accent }}
      aria-hidden="true"
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span>{initials(name || "Bot") || "B"}</span>
      )}
    </div>
  );
}

/** Exact Discord button styling — 32px tall, 3px radius, 14px/500 label. */
function buttonStyleClass(style: BotComponent["style"], type: BotComponent["type"]) {
  if (type === "link-button" || style === "link") return "bg-dc-grey text-white hover:bg-dc-grey-hover";
  switch (style) {
    case "primary":
      return "bg-dc-blurple text-white hover:bg-dc-blurple-hover";
    case "secondary":
      return "bg-dc-grey text-white hover:bg-dc-grey-hover";
    case "success":
      return "bg-dc-green text-white hover:bg-dc-green-hover";
    case "danger":
      return "bg-dc-red text-white hover:bg-dc-red-hover";
    default:
      return "bg-dc-grey text-white hover:bg-dc-grey-hover";
  }
}

function SelectPlaceholder({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex w-full min-w-0 max-w-[400px] cursor-pointer items-center justify-between gap-2 rounded-[4px] border border-dc-input bg-dc-embed px-3 py-[10px] text-[14px] leading-[18px] text-dc-muted transition hover:border-dc-border">
      <span className="flex min-w-0 items-center gap-2 truncate">
        {icon}
        <span className="truncate">{text}</span>
      </span>
      <ChevronDown className="size-[18px] shrink-0 text-dc-interactive" aria-hidden="true" />
    </div>
  );
}

/** Groups components into Discord action rows: 5 buttons per row, selects always full-width rows. */
function toActionRows(components: BotComponent[]): BotComponent[][] {
  const rows: BotComponent[][] = [];
  let current: BotComponent[] = [];
  for (const c of components) {
    const isButton = c.type === "button" || c.type === "link-button";
    if (isButton) {
      if (current.length === 5) {
        rows.push(current);
        current = [];
      }
      current.push(c);
    } else {
      if (current.length) {
        rows.push(current);
        current = [];
      }
      rows.push([c]);
    }
  }
  if (current.length) rows.push(current);
  return rows;
}

export function DiscordComponentRow({
  components,
  radius,
  onSelect,
  selectedId,
  nested,
}: {
  components: BotComponent[];
  radius: number;
  onSelect?: ((id: string) => void) | undefined;
  selectedId?: string | null | undefined;
  nested?: boolean | undefined;
}) {
  if (components.length === 0) return null;
  const rows = toActionRows(components);

  return (
    <div className={cn("flex flex-col gap-2", !nested && "mt-2")}>
      {rows.map((row, ri) => (
        <div key={ri} className="flex flex-wrap items-center gap-2">
          {row.map((c) => {
            const selected = selectedId === c.id;
            const ring = selected ? "outline outline-2 outline-offset-2 outline-white/60" : "";
            const isButton = c.type === "button" || c.type === "link-button";

            if (isButton) {
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={c.disabled}
                  onClick={() => onSelect?.(c.id)}
                  style={{ borderRadius: Math.min(radius, 8) }}
                  className={cn(
                    "inline-flex h-8 min-w-[60px] items-center justify-center gap-2 px-4 text-[14px] font-medium leading-4 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    buttonStyleClass(c.style, c.type),
                    ring,
                  )}
                >
                  {c.emoji && <span className="text-[16px] leading-none" aria-hidden="true">{c.emoji}</span>}
                  <span className="truncate">{c.label || "Button"}</span>
                  {(c.type === "link-button" || c.style === "link") && (
                    <ExternalLink className="size-4 opacity-80" aria-hidden="true" />
                  )}
                </button>
              );
            }

            const wrap = (node: React.ReactNode) => (
              <div key={c.id} onClick={() => onSelect?.(c.id)} className={cn("w-full rounded-[4px]", ring)}>
                {node}
              </div>
            );

            switch (c.type) {
              case "string-select":
                return wrap(<SelectPlaceholder icon={null} text={c.placeholder || c.label || "Make a selection"} />);
              case "user-select":
              case "mentionable-select":
                return wrap(<SelectPlaceholder icon={<Users className="size-4" />} text={c.placeholder || c.label} />);
              case "role-select":
                return wrap(
                  <SelectPlaceholder icon={<span aria-hidden="true">@</span>} text={c.placeholder || c.label} />,
                );
              case "channel-select":
                return wrap(<SelectPlaceholder icon={<Hash className="size-4" />} text={c.placeholder || c.label} />);
              case "separator":
                return wrap(<DiscordSeparator component={c} />);
              case "text-display":
                return wrap(<DiscordTextDisplay component={c} />);
              case "media-gallery":
                return wrap(<DiscordMediaGallery component={c} />);
              case "file":
                return wrap(<DiscordFile component={c} />);
              case "section":
                return wrap(<DiscordSection component={c} />);
              case "action-row":
                return wrap(
                  (c.children ?? []).length === 0 ? (
                    <p className="text-[14px] text-dc-muted">Empty action row — add buttons or a select menu.</p>
                  ) : (
                    <DiscordComponentRow components={c.children ?? []} radius={radius} nested />
                  ),
                );
              case "container":
                return wrap(
                  <DiscordContainer component={c}>
                    {(c.children ?? []).length === 0 ? (
                      <p className="text-[14px] text-dc-muted">Empty container — add components inside.</p>
                    ) : (
                      <DiscordComponentRow components={c.children ?? []} radius={radius} nested />
                    )}
                  </DiscordContainer>,
                );
              case "text-input":
                return wrap(
                  <div className="max-w-[400px]">
                    <p className="mb-2 text-[12px] font-bold uppercase leading-4 tracking-[0.02em] text-dc-muted">
                      {c.label}
                    </p>
                    <div className="rounded-[3px] border border-dc-input bg-dc-input px-3 py-[10px] text-[16px] leading-5 text-dc-muted">
                      {c.placeholder || "Type here..."}
                    </div>
                  </div>,
                );
              case "modal":
                return wrap(
                  <div className="max-w-[440px] overflow-hidden rounded-[5px] bg-dc-chat shadow-pop">
                    <div className="px-4 pt-4">
                      <p className="text-[20px] font-semibold leading-6 text-dc-header-text">{c.label || "Modal"}</p>
                    </div>
                    <div className="px-4 py-4">
                      <p className="mb-2 text-[12px] font-bold uppercase leading-4 text-dc-muted">Response</p>
                      <div className="rounded-[3px] border border-dc-input bg-dc-input px-3 py-[10px] text-[16px] text-dc-muted">
                        {c.placeholder || "Type your answer"}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 bg-[#2b2d31] px-4 py-4">
                      <button type="button" className="h-[38px] px-4 text-[14px] font-medium text-white hover:underline">
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="h-[38px] rounded-[3px] bg-dc-blurple px-4 text-[14px] font-medium text-white hover:bg-dc-blurple-hover"
                      >
                        Submit
                      </button>
                    </div>
                  </div>,
                );
              case "container":
                return wrap(
                  <div className="flex max-w-[520px] overflow-hidden rounded-[4px] bg-dc-embed">
                    <div className="w-1 shrink-0 bg-dc-grey" aria-hidden="true" />
                    <div className="px-4 py-3 text-[14px] leading-[18px] text-dc-text">
                      {c.label || "Container"} — nested components render here
                    </div>
                  </div>,
                );
              default:
                return null;
            }
          })}
        </div>
      ))}
    </div>
  );
}

/** Discord lays inline fields out on a 12-column grid, up to 3 per row. */
function fieldSpans(fields: EmbedField[]): number[] {
  const spans = new Array<number>(fields.length).fill(12);
  let i = 0;
  while (i < fields.length) {
    if (!fields[i]!.inline) {
      i++;
      continue;
    }
    let j = i;
    while (j < fields.length && fields[j]!.inline && j - i < 3) j++;
    const count = j - i;
    const span = Math.floor(12 / count);
    for (let k = i; k < j; k++) spans[k] = span;
    i = j;
  }
  return spans;
}

export function DiscordEmbed({
  embed,
  radius,
  selected,
  onClick,
}: {
  embed: Embed;
  radius: number;
  selected?: boolean | undefined;
  onClick?: (() => void) | undefined;
}) {
  const hasContent =
    embed.title || embed.description || embed.fields.length > 0 || embed.author.name || embed.footer.text || embed.image;
  const spans = fieldSpans(embed.fields);
  const hasThumbnail = Boolean(embed.thumbnail);

  return (
    <div
      onClick={onClick}
      className={cn(
        "mt-2 max-w-[516px] overflow-hidden border-l-4 bg-dc-embed py-2 pl-3 pr-4 font-discord",
        onClick && "cursor-pointer",
        selected && "outline outline-2 outline-white/60",
      )}
      style={{ borderRadius: radius, borderLeftColor: embed.color || "#1e1f22" }}
    >
      <div
        className={cn("grid gap-x-4", hasThumbnail ? "grid-cols-[minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)]")}
      >
        {/* Column 1 — author / title / description / fields */}
        <div className="min-w-0">
          {embed.author.name && (
            <div className="mt-2 flex items-center gap-2 first:mt-0">
              {embed.author.icon && (
                <img src={embed.author.icon} alt="" className="size-6 shrink-0 rounded-full object-cover" loading="lazy" />
              )}
              {embed.author.url ? (
                <a
                  href={embed.author.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[14px] font-semibold leading-[18px] text-dc-header-text hover:underline"
                >
                  {embed.author.name}
                </a>
              ) : (
                <span className="text-[14px] font-semibold leading-[18px] text-dc-header-text">{embed.author.name}</span>
              )}
            </div>
          )}

          {embed.title &&
            (embed.url ? (
              <a
                href={embed.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 block first:mt-0 hover:underline"
              >
                <DiscordMarkdown
                  text={embed.title}
                  className="text-[16px] font-semibold leading-[22px] text-dc-link"
                />
              </a>
            ) : (
              <DiscordMarkdown
                text={embed.title}
                className="mt-2 text-[16px] font-semibold leading-[22px] text-dc-header-text first:mt-0"
              />
            ))}

          {embed.description && (
            <DiscordMarkdown
              text={embed.description}
              className="mt-2 text-[14px] font-normal leading-[18px] text-dc-text first:mt-0"
            />
          )}

          {embed.fields.length > 0 && (
            <div className="mt-2 grid grid-cols-12 gap-x-2 gap-y-2 first:mt-0">
              {embed.fields.map((f, i) => (
                <div key={f.id} className="min-w-0" style={{ gridColumn: `span ${spans[i]} / span ${spans[i]}` }}>
                  <DiscordMarkdown
                    text={f.name || "Field name"}
                    className="mb-[2px] text-[14px] font-semibold leading-[18px] text-dc-header-text"
                  />
                  <DiscordMarkdown text={f.value} className="text-[14px] font-normal leading-[18px] text-dc-text" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Column 2 — thumbnail */}
        {hasThumbnail && (
          <img
            src={embed.thumbnail}
            alt=""
            className="mt-2 max-h-20 max-w-20 shrink-0 rounded-[4px] object-contain"
            loading="lazy"
          />
        )}

        {/* Full-width rows */}
        {embed.image && (
          <div className={cn("mt-4", hasThumbnail && "col-span-2")}>
            <img
              src={embed.image}
              alt=""
              className="max-h-[300px] w-auto max-w-full rounded-[4px] object-contain"
              loading="lazy"
            />
          </div>
        )}

        {(embed.footer.text || embed.timestamp) && (
          <div className={cn("mt-2 flex items-center", hasThumbnail && "col-span-2")}>
            {embed.footer.icon && (
              <img src={embed.footer.icon} alt="" className="mr-2 size-5 shrink-0 rounded-full object-cover" loading="lazy" />
            )}
            <span className="text-[12px] font-medium leading-4 text-dc-text">
              {embed.footer.text}
              {embed.footer.text && embed.timestamp && <span className="mx-1">•</span>}
              {embed.timestamp && nowLabel()}
            </span>
          </div>
        )}

        {!hasContent && (
          <p className={cn("text-[14px] leading-[18px] text-dc-muted", hasThumbnail && "col-span-2")}>
            Empty embed — add a title or description.
          </p>
        )}
      </div>
    </div>
  );
}


export interface DiscordMessagePreviewProps {
  design: BotDesign;
  components?: BotComponent[] | undefined;
  content?: string | undefined;
  selectedEmbedId?: string | null | undefined;
  selectedComponentId?: string | null | undefined;
  onSelectEmbed?: ((id: string) => void) | undefined;
  onSelectComponent?: ((id: string) => void) | undefined;
  className?: string | undefined;
  channelName?: string | undefined;
}

/** Pixel-accurate Discord message rendering built entirely from HTML/CSS. */
export function DiscordMessagePreview({
  design,
  components = [],
  content,
  selectedEmbedId,
  selectedComponentId,
  onSelectEmbed,
  onSelectComponent,
  className,
  channelName = "general",
}: DiscordMessagePreviewProps) {
  const body = content ?? design.messageContent;
  const compact = design.messageStyle === "compact";

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border border-border bg-dc-chat font-discord",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-black/20 bg-dc-header px-4 py-3 shadow-[0_1px_0_rgba(0,0,0,0.2)]">
        <Hash className="size-6 text-dc-muted" aria-hidden="true" />
        <span className="text-[16px] font-semibold text-dc-header-text">{channelName}</span>
        <span className="ml-auto text-[12px] text-dc-muted">Live preview</span>
      </div>
      <div className="discord-scroll flex-1 overflow-y-auto bg-dc-chat py-4">
        <div
          className={cn(
            "group relative px-4 hover:bg-dc-chat-hover",
            compact ? "py-[2px] pl-4" : "mt-[17px] flex gap-4 pl-4",
          )}
        >
          {!compact && <BotAvatar src={design.botAvatar} name={design.botName} accent={design.accentColor} />}
          <div className="min-w-0 flex-1">
            <div className={cn("flex flex-wrap items-center gap-2", compact && "inline-flex align-baseline")}>
              {compact && <span className="text-[12px] text-dc-muted">{nowLabel()}</span>}
              <span className="text-[16px] font-medium leading-[22px]" style={{ color: design.accentColor }}>
                {design.botName || "Bottly Bot"}
              </span>
              <span className="inline-flex h-[15px] items-center gap-[2px] rounded-[3px] bg-dc-blurple px-[4px] text-[10px] font-medium uppercase leading-[15px] text-white">
                <svg viewBox="0 0 16 15.2" className="size-[10px] fill-current" aria-hidden="true">
                  <path d="M7.4,11.17,4,8.62,5,7.26l2.4,1.8L11.4,3.1l1.4,1Z" />
                </svg>
                App
              </span>
              {!compact && <span className="text-[12px] leading-[22px] text-dc-muted">{nowLabel()}</span>}
            </div>
            {body && (
              <DiscordMarkdown text={body} className="text-[16px] font-normal leading-[22px] text-dc-text" />
            )}
            {design.embeds.map((embed) => (
              <Fragment key={embed.id}>
                <DiscordEmbed
                  embed={embed}
                  radius={design.borderRadius}
                  selected={selectedEmbedId === embed.id}
                  onClick={onSelectEmbed ? () => onSelectEmbed(embed.id) : undefined}
                />
              </Fragment>
            ))}
            <DiscordComponentRow
              components={components}
              radius={design.borderRadius}
              onSelect={onSelectComponent}
              selectedId={selectedComponentId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function botToDesign(bot: Bot): BotDesign {
  return { ...bot.design, botName: bot.design.botName || bot.name, botAvatar: bot.design.botAvatar || bot.avatar };
}
