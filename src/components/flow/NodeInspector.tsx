import { GripVertical, Plus, Trash2, SlidersHorizontal } from "lucide-react";
import { motion } from "motion/react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmbedEditor } from "@/components/embed/EmbedEditor";
import { ComponentsV2Builder } from "@/components/builder/ComponentsV2Builder";
import { VariableInput } from "@/components/flow/VariableInput";
import { CATEGORY_META, getNodeDef } from "@/data/node-catalog";
import { nodeIcon } from "@/components/flow/node-icons";
import { COMMAND_OPTION_TYPES } from "@/data/catalog";
import { createCommandOption } from "@/data/factories";
import { useFlowStore } from "@/stores/useFlowStore";
import type { CommandOption, CommandOptionType } from "@/types/bot";
import type { FlowNode, MessageType } from "@/types/flow";

export function NodeInspector({ node }: { node: FlowNode | undefined }) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const updateNodeConfig = useFlowStore((s) => s.updateNodeConfig);
  const duplicateNodes = useFlowStore((s) => s.duplicateNodes);
  const deleteNodes = useFlowStore((s) => s.deleteNodes);

  if (!node) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#18191C] px-6 text-center">
        <SlidersHorizontal className="size-5 text-[#4E5058]" aria-hidden="true" />
        <p className="text-[13px] text-[#B5BAC1]">Select a node to edit its properties.</p>
      </div>
    );
  }

  const def = getNodeDef(node.data.type);
  const meta = CATEGORY_META[def.category];
  const Icon = nodeIcon(def.icon);
  const options = node.data.options ?? [];

  const setOptions = (next: CommandOption[]) => updateNodeData(node.id, { options: next });

  const isMessageNode = Boolean(def.hasEmbed || def.hasComponents);
  const messageType: MessageType = node.data.messageType ?? "embed";

  return (
    <motion.div
      key={node.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18 }}
      className="flex h-full min-h-0 flex-col bg-[#18191C]"
    >
      <header className="flex items-center gap-2 border-b border-white/8 px-3 py-2.5">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-[6px]"
          style={{ background: `${meta.color}22`, color: meta.color }}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <input
            value={node.data.title}
            onChange={(e) => updateNodeData(node.id, { title: e.target.value })}
            aria-label="Node title"
            className="w-full bg-transparent text-[13px] font-semibold text-[#F2F3F5] outline-none focus:underline"
          />
          <p className="truncate text-[11px] text-[#B5BAC1]">{meta.label}</p>
        </div>
        <Switch
          checked={node.data.enabled}
          onCheckedChange={(v) => updateNodeData(node.id, { enabled: v })}
          aria-label="Node enabled"
        />
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        <p className="text-[12px] leading-4 text-[#B5BAC1]">{def.description}</p>

        {def.fields.length > 0 && (
          <div className="space-y-3">
            {def.fields.map((f) => {
              const id = `${node.id}-${f.key}`;
              const value = node.data.config[f.key];
              if (f.kind === "switch") {
                return (
                  <div key={f.key} className="flex items-center justify-between rounded-md bg-[#1E1F22] px-3 py-2">
                    <Label htmlFor={id} className="text-[12px] text-[#DBDEE1]">
                      {f.label}
                    </Label>
                    <Switch
                      id={id}
                      checked={Boolean(value)}
                      onCheckedChange={(v) => updateNodeConfig(node.id, f.key, v)}
                    />
                  </div>
                );
              }
              if (f.kind === "select") {
                return (
                  <div key={f.key} className="space-y-1.5">
                    <Label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-[#B5BAC1]">
                      {f.label}
                    </Label>
                    <Select
                      value={String(value ?? "")}
                      onValueChange={(v) => updateNodeConfig(node.id, f.key, v)}
                    >
                      <SelectTrigger id={id} className="bg-[#111214] text-[13px]">
                        <SelectValue placeholder="Choose…" />
                      </SelectTrigger>
                      <SelectContent>
                        {(f.options ?? []).map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              }
              if (f.kind === "number") {
                return (
                  <div key={f.key} className="space-y-1.5">
                    <Label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-[#B5BAC1]">
                      {f.label}
                    </Label>
                    <Input
                      id={id}
                      type="number"
                      value={Number(value ?? 0)}
                      onChange={(e) => updateNodeConfig(node.id, f.key, Number(e.target.value))}
                      className="bg-[#111214] text-[13px]"
                    />
                  </div>
                );
              }
              if (f.kind === "textarea") {
                return (
                  <div key={f.key} className="space-y-1.5">
                    <Label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-[#B5BAC1]">
                      {f.label}
                    </Label>
                    <Textarea
                      id={id}
                      rows={3}
                      value={String(value ?? "")}
                      placeholder={f.placeholder ?? ""}
                      onChange={(e) => updateNodeConfig(node.id, f.key, e.target.value)}
                      className="bg-[#111214] text-[13px]"
                    />
                  </div>
                );
              }
              if (f.kind === "rich") {
                return (
                  <VariableInput
                    key={f.key}
                    id={id}
                    label={f.label}
                    value={String(value ?? "")}
                    placeholder={f.placeholder}
                    multiline={f.key === "content" || f.key === "template"}
                    onChange={(v) => updateNodeConfig(node.id, f.key, v)}
                  />
                );
              }
              return (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-[#B5BAC1]">
                    {f.label}
                  </Label>
                  <Input
                    id={id}
                    value={String(value ?? "")}
                    placeholder={f.placeholder ?? ""}
                    onChange={(e) => updateNodeConfig(node.id, f.key, e.target.value)}
                    className="bg-[#111214] text-[13px]"
                  />
                </div>
              );
            })}
          </div>
        )}

        {def.hasCommandOptions && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#B5BAC1]">Command options</h3>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-[12px] text-[#B5BAC1]"
                onClick={() => setOptions([...options, createCommandOption()])}
              >
                <Plus className="size-3" aria-hidden="true" />
                Add
              </Button>
            </div>
            {options.length === 0 && (
              <p className="rounded-md border border-dashed border-white/10 p-3 text-center text-[12px] text-[#B5BAC1]">
                No options yet.
              </p>
            )}
            {options.map((o, i) => (
              <div
                key={o.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/bottly-cmd-opt", String(i))}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = Number(e.dataTransfer.getData("text/bottly-cmd-opt"));
                  if (Number.isNaN(from)) return;
                  const list = [...options];
                  const [item] = list.splice(from, 1);
                  if (item) list.splice(i, 0, item);
                  setOptions(list);
                }}
                className="space-y-2 rounded-md border border-white/8 bg-[#1E1F22] p-2.5"
              >
                <div className="flex items-center gap-1.5">
                  <GripVertical className="size-3.5 cursor-grab text-[#72767d]" aria-hidden="true" />
                  <Input
                    value={o.name}
                    onChange={(e) =>
                      setOptions(options.map((x) => (x.id === o.id ? { ...x, name: e.target.value } : x)))
                    }
                    aria-label="Option name"
                    className="h-7 bg-[#111214] font-mono text-[12px]"
                  />
                  <button
                    type="button"
                    aria-label="Remove option"
                    className="text-[#B5BAC1] hover:text-[#ED4245]"
                    onClick={() => setOptions(options.filter((x) => x.id !== o.id))}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
                <Input
                  value={o.description}
                  onChange={(e) =>
                    setOptions(options.map((x) => (x.id === o.id ? { ...x, description: e.target.value } : x)))
                  }
                  placeholder="Description"
                  aria-label="Option description"
                  className="h-7 bg-[#111214] text-[12px]"
                />
                <div className="flex items-center gap-2">
                  <Select
                    value={o.type}
                    onValueChange={(v) =>
                      setOptions(
                        options.map((x) => (x.id === o.id ? { ...x, type: v as CommandOptionType } : x)),
                      )
                    }
                  >
                    <SelectTrigger className="h-7 flex-1 bg-[#111214] text-[12px]" aria-label="Option type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMAND_OPTION_TYPES.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-1 text-[11px] text-[#B5BAC1]">
                    <Switch
                      checked={o.required}
                      onCheckedChange={(v) =>
                        setOptions(options.map((x) => (x.id === o.id ? { ...x, required: v } : x)))
                      }
                      aria-label="Required"
                    />
                    Required
                  </label>
                  <label className="flex items-center gap-1 text-[11px] text-[#B5BAC1]">
                    <Switch
                      checked={o.autocomplete}
                      onCheckedChange={(v) =>
                        setOptions(options.map((x) => (x.id === o.id ? { ...x, autocomplete: v } : x)))
                      }
                      aria-label="Autocomplete"
                    />
                    Auto
                  </label>
                </div>
              </div>
            ))}
          </section>
        )}

        {isMessageNode && (
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#B5BAC1]">Message builder</h3>
            <div
              role="tablist"
              aria-label="Message type"
              className="grid grid-cols-2 gap-1 rounded-md bg-[#111214] p-1"
            >
              {(["embed", "components"] as MessageType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={messageType === t}
                  onClick={() => updateNodeData(node.id, { messageType: t })}
                  className={
                    "rounded-[4px] px-2 py-1.5 text-[12px] font-medium transition-colors " +
                    (messageType === t
                      ? "bg-[#5865F2] text-white"
                      : "text-[#B5BAC1] hover:bg-white/5 hover:text-white")
                  }
                >
                  {t === "embed" ? "Embed" : "Component-Based Message"}
                </button>
              ))}
            </div>
            <p className="text-[11px] leading-4 text-[#80848E]">
              {messageType === "embed"
                ? "Classic Discord embed: title, description, color, author, fields, images and footer."
                : "Discord Components V2: build the whole message out of containers, text displays, sections, galleries, separators and action rows."}
            </p>

            {messageType === "embed" ? (
              node.data.embed ? (
                <EmbedEditor embed={node.data.embed} onChange={(embed) => updateNodeData(node.id, { embed })} />
              ) : (
                <p className="text-[12px] text-[#B5BAC1]">This node does not carry an embed payload.</p>
              )
            ) : (
              <ComponentsV2Builder
                compact
                components={node.data.components ?? []}
                onChange={(components) => updateNodeData(node.id, { components })}
              />
            )}
          </section>
        )}
      </div>

      <footer className="flex gap-2 border-t border-white/8 p-3">
        <Button

          size="sm"
          variant="secondary"
          className="flex-1 bg-[#2B2D31] text-[12px] text-[#F2F3F5] hover:bg-[#35373C]"
          onClick={() => duplicateNodes([node.id])}
        >
          Duplicate
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 text-[12px] text-[#ED4245] hover:bg-[#ED4245]/10 hover:text-[#ED4245]"
          onClick={() => deleteNodes([node.id])}
        >
          Delete
        </Button>
      </footer>
    </motion.div>
  );
}
