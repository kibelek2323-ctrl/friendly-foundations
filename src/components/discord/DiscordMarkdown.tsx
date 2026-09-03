import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Discord-flavoured markdown renderer used by the message preview.
 * Supports: headings (#, ##, ###), subtext (-#), code blocks, inline code,
 * bold, underline, italics, strikethrough, spoilers, links, blockquotes,
 * ordered/unordered lists, and real Discord mention syntax
 * (<@id>, <@!id>, <@&id>, <#id>, </cmd:id>, <:name:id>, <t:stamp>).
 *
 * `flavor="plain"` keeps standard markdown but disables Discord-only syntax
 * (mentions, spoilers, timestamps) — used for marketplace/blog copy.
 */

export type MarkdownFlavor = "discord" | "plain";

function Mention({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-[3px] bg-dc-mention px-[2px] font-medium text-[#c9cdfb] transition hover:bg-dc-blurple hover:text-white">
      {children}
    </span>
  );
}

function renderInline(text: string, keyPrefix: string, flavor: MarkdownFlavor): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let i = 0;
  const sub = (s: string, key: string) => renderInline(s, key, flavor);

  const common: Array<[RegExp, (m: RegExpMatchArray, key: string) => ReactNode]> = [
    [/^`([^`]+)`/, (m, key) => (
      <code key={key} className="rounded-[3px] bg-dc-input px-[2px] py-[1px] font-mono text-[0.85em] text-dc-text">
        {m[1]}
      </code>
    )],
    [/^\*\*\*([\s\S]+?)\*\*\*/, (m, key) => <strong key={key} className="font-bold italic">{sub(m[1]!, key)}</strong>],
    [/^\*\*([\s\S]+?)\*\*/, (m, key) => <strong key={key} className="font-bold">{sub(m[1]!, key)}</strong>],
    [/^__([\s\S]+?)__/, (m, key) => <u key={key}>{sub(m[1]!, key)}</u>],
    [/^~~([\s\S]+?)~~/, (m, key) => <s key={key}>{sub(m[1]!, key)}</s>],
    [/^([*_])([\s\S]+?)\1/, (m, key) => <em key={key}>{sub(m[2]!, key)}</em>],
    [/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/, (m, key) => (
      <a key={key} href={m[2]} target="_blank" rel="noreferrer" className="text-dc-link hover:underline">
        {sub(m[1]!, key)}
      </a>
    )],
    [/^<(https?:\/\/[^\s>]+)>/, (m, key) => (
      <a key={key} href={m[1]} target="_blank" rel="noreferrer" className="text-dc-link hover:underline">
        {m[1]}
      </a>
    )],
    [/^(https?:\/\/[^\s<]+)/, (m, key) => (
      <a key={key} href={m[1]} target="_blank" rel="noreferrer" className="text-dc-link hover:underline">
        {m[1]}
      </a>
    )],
  ];

  const discordOnly: Array<[RegExp, (m: RegExpMatchArray, key: string) => ReactNode]> = [
    [/^\|\|([\s\S]+?)\|\|/, (m, key) => (
      <span key={key} className="rounded-[3px] bg-dc-input px-1 text-transparent transition hover:text-dc-text">
        {m[1]}
      </span>
    )],
    // <@123> user, <@!123> nickname, <@&123> role
    [/^<@!?(\d+)>/, (_m, key) => <Mention key={key}>@user</Mention>],
    [/^<@&(\d+)>/, (_m, key) => <Mention key={key}>@role</Mention>],
    // <#123> channel — the correct Discord channel syntax
    [/^<#(\d+)>/, (_m, key) => <Mention key={key}>#channel</Mention>],
    // Friendly authoring shortcuts used by the builder: <#general>, <@name>, <@&mods>
    [/^<@&([\w -]{1,32})>/, (m, key) => <Mention key={key}>@{m[1]}</Mention>],
    [/^<@!?([\w -]{1,32})>/, (m, key) => <Mention key={key}>@{m[1]}</Mention>],
    [/^<#([\w-]{1,32})>/, (m, key) => <Mention key={key}>#{m[1]}</Mention>],
    [/^@(everyone|here)\b/, (m, key) => <Mention key={key}>@{m[1]}</Mention>],
    // </name:id> slash command mention
    [/^<\/([\w -]{1,64}):(\d+)>/, (m, key) => <Mention key={key}>/{m[1]}</Mention>],
    // <:name:id> / <a:name:id> custom emoji
    [/^<a?:(\w+):(\d+)>/, (m, key) => (
      <span key={key} className="text-dc-muted">:{m[1]}:</span>
    )],
    // <t:1234567890:R> timestamp
    [/^<t:(\d+)(?::([tTdDfFR]))?>/, (m, key) => (
      <span key={key} className="rounded-[3px] bg-dc-mention px-[2px] text-dc-text">
        {new Date(Number(m[1]) * 1000).toLocaleString()}
      </span>
    )],
  ];

  const patterns = flavor === "discord" ? [...common, ...discordOnly] : common;

  while (rest.length > 0) {
    let matched = false;
    for (const [re, render] of patterns) {
      const m = rest.match(re);
      if (m) {
        out.push(render(m, `${keyPrefix}-${i++}`));
        rest = rest.slice(m[0].length);
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const next = rest.slice(1).search(/[*_~|`[<@h]/);
    const take = next === -1 ? rest.length : next + 1;
    out.push(<Fragment key={`${keyPrefix}-t${i++}`}>{rest.slice(0, take)}</Fragment>);
    rest = rest.slice(take);
  }
  return out;
}

const HEADING_CLASS: Record<1 | 2 | 3, string> = {
  1: "mt-4 mb-2 text-[1.5em] font-bold leading-[1.25em] first:mt-0",
  2: "mt-4 mb-2 text-[1.25em] font-bold leading-[1.25em] first:mt-0",
  3: "mt-4 mb-2 text-[1.05em] font-bold leading-[1.25em] first:mt-0",
};

function renderLine(line: string, key: string, flavor: MarkdownFlavor): ReactNode {
  const heading = line.match(/^(#{1,3})\s+(.*)$/);
  if (heading) {
    const level = heading[1]!.length as 1 | 2 | 3;
    const Tag = (`h${level}` as const);
    return (
      <Tag key={key} className={HEADING_CLASS[level]}>
        {renderInline(heading[2]!, key, flavor)}
      </Tag>
    );
  }

  const subtext = line.match(/^-#\s+(.*)$/);
  if (subtext) {
    return (
      <div key={key} className="text-[0.8em] leading-[1.3em] text-dc-muted">
        {renderInline(subtext[1]!, key, flavor)}
      </div>
    );
  }

  const quote = line.match(/^>\s?(.*)$/);
  if (quote) {
    return (
      <div key={key} className="flex gap-2 py-[2px]">
        <span className="w-1 shrink-0 rounded-[4px] bg-[#4e5058]" />
        <span>{renderInline(quote[1]!, key, flavor)}</span>
      </div>
    );
  }

  const ordered = line.match(/^(\s*)(\d{1,3})[.)]\s+(.*)$/);
  if (ordered) {
    return (
      <div key={key} className="flex gap-2" style={{ paddingLeft: 8 + Math.min(ordered[1]!.length, 8) * 8 }}>
        <span aria-hidden="true">{ordered[2]}.</span>
        <span>{renderInline(ordered[3]!, key, flavor)}</span>
      </div>
    );
  }

  const bullet = line.match(/^(\s*)[-*]\s+(.*)$/);
  if (bullet) {
    return (
      <div key={key} className="flex gap-2" style={{ paddingLeft: 8 + Math.min(bullet[1]!.length, 8) * 8 }}>
        <span aria-hidden="true">•</span>
        <span>{renderInline(bullet[2]!, key, flavor)}</span>
      </div>
    );
  }

  return null;
}

export function DiscordMarkdown({
  text,
  className,
  flavor = "discord",
}: {
  text: string;
  className?: string | undefined;
  flavor?: MarkdownFlavor;
}) {
  if (!text) return null;
  const blocks = text.split(/```/);

  return (
    <div className={cn("whitespace-pre-wrap break-words", className)}>
      {blocks.map((block, bi) => {
        if (bi % 2 === 1) {
          const lines = block.replace(/^\w*\n/, "");
          return (
            <pre
              key={bi}
              className="my-2 overflow-x-auto rounded-[4px] border border-dc-input bg-dc-input p-2 font-mono text-[0.875rem] leading-[1.125rem] text-dc-text"
            >
              <code>{lines}</code>
            </pre>
          );
        }
        return block.split("\n").map((line, li) => {
          const key = `${bi}-${li}`;
          const rendered = renderLine(line, key, flavor);
          if (rendered) return rendered;
          return (
            <Fragment key={key}>
              {li > 0 && <br />}
              {renderInline(line, key, flavor)}
            </Fragment>
          );
        });
      })}
    </div>
  );
}
