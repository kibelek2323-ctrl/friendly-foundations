import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_META, getNodeDef } from "@/data/node-catalog";
import { nodeIcon } from "@/components/flow/node-icons";
import type { FlowNodeData } from "@/types/flow";

export type BottlyFlowNode = Node<FlowNodeData, "bottly">;

const HANDLE_LABEL: Record<string, string> = {
  true: "TRUE",
  false: "FALSE",
  a: "A",
  b: "B",
  blocked: "BLOCKED",
};

function summaryLines(data: FlowNodeData): { label: string; value: string }[] {
  const def = getNodeDef(data.type);
  const lines: { label: string; value: string }[] = [];
  if (def.hasEmbed && data.embed) {
    lines.push({ label: "Embed", value: data.embed.title || data.embed.description || "Untitled embed" });
  }
  for (const field of def.fields) {
    if (lines.length >= 3) break;
    const raw = data.config[field.key];
    if (raw === undefined || raw === "" || typeof raw === "boolean") continue;
    lines.push({ label: field.label, value: String(raw) });
  }
  if (def.hasComponents && data.components?.length) {
    lines.push({ label: "Components", value: `${data.components.length} attached` });
  }
  return lines.slice(0, 3);
}

function BottlyNodeInner({ data, selected }: NodeProps<BottlyFlowNode>) {
  const def = getNodeDef(data.type);
  const meta = CATEGORY_META[def.category];
  const Icon = nodeIcon(def.icon);
  const lines = summaryLines(data);
  const outputs = def.outputs;

  return (
    <div
      className={cn(
        "group w-[248px] overflow-hidden rounded-lg border bg-[#1E1F22] text-left shadow-[0_2px_8px_rgba(0,0,0,0.35)] transition-all duration-150",
        selected ? "border-[#5865F2] shadow-[0_0_0_1px_#5865F2,0_0_24px_-6px_#5865F2]" : "border-white/8",
        !data.enabled && "opacity-55 saturate-0",
      )}
      style={{ borderColor: selected ? "#5865F2" : undefined }}
    >
      {def.inputs > 0 && (
        <Handle
          id="in"
          type="target"
          position={Position.Top}
          className="!size-2.5 !border-2 !border-[#111214] !bg-[#B5BAC1] hover:!bg-[#5865F2]"
        />
      )}

      <div
        className="flex items-center gap-2 border-b border-white/8 px-3 py-2"
        style={{ background: `linear-gradient(90deg, ${meta.color}22, transparent)` }}
      >
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-[5px]"
          style={{ background: `${meta.color}26`, color: meta.color }}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#F2F3F5]">{data.title}</span>
        {!data.enabled && <EyeOff className="size-3.5 text-[#B5BAC1]" aria-hidden="true" />}
      </div>

      <div className="space-y-1.5 px-3 py-2.5">
        <p className="line-clamp-2 text-[11px] leading-4 text-[#B5BAC1]">{def.description}</p>
        {lines.length > 0 && (
          <div className="space-y-1 border-t border-white/5 pt-2">
            {lines.map((l) => (
              <div key={l.label} className="flex items-baseline gap-1.5 text-[11px] leading-4">
                <span className="shrink-0 text-[#72767d]">{l.label}:</span>
                <span className="truncate font-medium text-[#DBDEE1]">{l.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="relative h-4">
        {outputs.map((out, i) => {
          const left = ((i + 1) / (outputs.length + 1)) * 100;
          const label = HANDLE_LABEL[out];
          return (
            <div key={out}>
              <Handle
                id={out}
                type="source"
                position={Position.Bottom}
                style={{ left: `${left}%` }}
                className={cn(
                  "!size-2.5 !border-2 !border-[#111214]",
                  out === "true" ? "!bg-[#23A55A]" : out === "false" ? "!bg-[#ED4245]" : "!bg-[#B5BAC1]",
                  "hover:!bg-[#5865F2]",
                )}
              />
              {label && (
                <span
                  className="pointer-events-none absolute -translate-x-1/2 text-[9px] font-semibold tracking-wide"
                  style={{
                    left: `${left}%`,
                    bottom: "10px",
                    color: out === "true" ? "#23A55A" : out === "false" ? "#ED4245" : "#B5BAC1",
                  }}
                >
                  {label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const BottlyNode = memo(BottlyNodeInner);
