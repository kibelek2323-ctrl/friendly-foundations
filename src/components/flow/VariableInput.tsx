import { useRef } from "react";
import { Braces } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VARIABLES } from "@/data/node-catalog";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string | undefined;
  multiline?: boolean | undefined;
}

const GROUPS = Array.from(new Set(VARIABLES.map((v) => v.group)));

export function VariableInput({ id, label, value, onChange, placeholder, multiline }: Props) {
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const insert = (token: string) => {
    const el = ref.current;
    if (!el) {
      onChange(`${value}${token}`);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const used = VARIABLES.filter((v) => value.includes(v.token));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-[#B5BAC1]">
          {label}
        </Label>
        <Popover>
          <PopoverTrigger
            className="flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[11px] text-[#B5BAC1] transition hover:bg-white/5 hover:text-[#F2F3F5]"
            type="button"
          >
            <Braces className="size-3" aria-hidden="true" />
            Insert variable
          </PopoverTrigger>
          <PopoverContent align="end" className="max-h-72 w-64 overflow-y-auto p-2">
            {GROUPS.map((group) => (
              <div key={group} className="mb-2 last:mb-0">
                <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group}
                </p>
                <div className="flex flex-wrap gap-1">
                  {VARIABLES.filter((v) => v.group === group).map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => insert(v.token)}
                      className="rounded-[4px] bg-[#5865F2]/15 px-1.5 py-1 font-mono text-[11px] text-[#a9b1ff] transition hover:bg-[#5865F2]/30"
                    >
                      {v.token}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </PopoverContent>
        </Popover>
      </div>
      {multiline ? (
        <Textarea
          id={id}
          ref={ref as React.Ref<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? ""}
          rows={3}
          className="resize-y bg-[#111214] text-[13px]"
        />
      ) : (
        <Input
          id={id}
          ref={ref as React.Ref<HTMLInputElement>}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? ""}
          className="bg-[#111214] text-[13px]"
        />
      )}
      {used.length > 0 && (
        <div className={cn("flex flex-wrap gap-1")}>
          {used.map((v) => (
            <span
              key={v.token}
              className="rounded-full bg-[#5865F2]/15 px-2 py-0.5 text-[10px] font-medium text-[#a9b1ff]"
            >
              {v.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
