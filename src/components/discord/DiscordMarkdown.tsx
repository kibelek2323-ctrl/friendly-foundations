import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal Discord-flavoured markdown renderer used by the message preview.
 * Supports: code blocks, inline code, bold, underline, italics, strikethrough,
 * spoilers, links, blockquotes, lists, mentions and channels.
 */

const INLINE = /(\*\*\*|\*\*|__|~~|\|\||\*|_|`)/;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let i = 0;

  const patterns: Array<[RegExp, (m: RegExpMatchArray, key: string) => ReactNode]> = [
    [/^`([^`]+)`/, (m, key) => (
      <code key={key} className="rounded-[3px] bg-dc-input px-[2px] py-[1px] font-mono text-[0.85em] text-dc-text">
        {m[1]}
      </code>
    )],
    [/^\*\*\*([\s\S]+?)\*\*\*/, (m, key) => <strong key={key} className="font-bold italic">{renderInline(m[1]!, key)}</strong>],
    [/^\*\*([\s\S]+?)\*\*/, (m, key) => <strong key={key} className="font-bold">{renderInline(m[1]!, key)}</strong>],
    [/^__([\s\S]+?)__/, (m, key) => <u key={key}>{renderInline(m[1]!, key)}</u>],
    [/^~~([\s\S]+?)~~/, (m, key) => <s key={key}>{renderInline(m[1]!, key)}</s>],
    [/^\|\|([\s\S]+?)\|\|/, (m, key) => (
      <span key={key} className="rounded-[3px] bg-dc-input px-1 text-transparent transition hover:text-dc-text">
        {m[1]}
      </span>
    )],
    [/^([*_])([\s\S]+?)\1/, (m, key) => <em key={key}>{renderInline(m[2]!, key)}</em>],
    [/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/, (m, key) => (
      <a key={key} href={m[2]} target="_blank" rel="noreferrer" className="text-dc-link hover:underline">
        {m[1]}
      </a>
    )],
    [/^(https?:\/\/[^\s<]+)/, (m, key) => (
      <a key={key} href={m[1]} target="_blank" rel="noreferrer" className="text-dc-link hover:underline">
        {m[1]}
      </a>
    )],
    [/^<?([@#])([!&]?)([\w\s-]{1,32})>?/, (m, key) => (
      <span key={key} className="rounded-[3px] bg-dc-mention px-[2px] font-medium text-[#c9cdfb] hover:bg-dc-blurple hover:text-white">
        {m[1]}
        {m[3]}
      </span>
    )],
  ];

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
    // Consume plain text up to the next possible token
    const next = rest.slice(1).search(/[*_~|`[<@#h]/);
    const take = next === -1 ? rest.length : next + 1;
    out.push(<Fragment key={`${keyPrefix}-t${i++}`}>{rest.slice(0, take)}</Fragment>);
    rest = rest.slice(take);
  }
  return out;
}

export function DiscordMarkdown({ text, className }: { text: string; className?: string | undefined }) {
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
          const quote = line.match(/^>\s?(.*)$/);
          if (quote) {
            return (
              <div key={key} className="flex gap-2 py-[2px]">
                <span className="w-1 shrink-0 rounded-[4px] bg-[#4e5058]" />
                <span>{renderInline(quote[1]!, key)}</span>
              </div>
            );
          }
          const bullet = line.match(/^\s*[-*]\s+(.*)$/);
          if (bullet) {
            return (
              <div key={key} className="flex gap-2 pl-2">
                <span aria-hidden="true">•</span>
                <span>{renderInline(bullet[1]!, key)}</span>
              </div>
            );
          }
          return (
            <Fragment key={key}>
              {li > 0 && <br />}
              {renderInline(line, key)}
            </Fragment>
          );
        });
      })}
    </div>
  );
}
