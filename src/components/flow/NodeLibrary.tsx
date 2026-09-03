import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronRight, LayoutTemplate, Loader2, Plus, Search, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CATEGORY_META, NODE_DEFS } from "@/data/node-catalog";
import { FLOW_EXAMPLES } from "@/data/flow-examples";
import { nodeIcon } from "@/components/flow/node-icons";
import { listPublicTemplates } from "@/lib/templates.functions";
import type { NodeCategory } from "@/types/flow";
import { cn } from "@/lib/utils";

interface Props {
  onCreateCommand: () => void;
  onUseExample: (exampleId: string) => void;
  onUseTemplate: (templateId: string) => void;
  onAddNode: (type: string) => void;
}

const CATEGORY_ORDER: NodeCategory[] = [
  "triggers",
  "messages",
  "components",
  "moderation",
  "logic",
  "data",
  "variables",
];

export function NodeLibrary({ onCreateCommand, onUseExample, onUseTemplate, onAddNode }: Props) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const listTemplates = useServerFn(listPublicTemplates);

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ["flow-templates"],
    queryFn: () => listTemplates(),
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return NODE_DEFS.filter(
      (d) => !q || d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q),
    );
  }, [query]);

  const exampleCategories = useMemo(
    () => Array.from(new Set(FLOW_EXAMPLES.map((e) => e.category))),
    [],
  );

  const templateCategories = useMemo(
    () => Array.from(new Set((templates ?? []).map((t) => t.category))),
    [templates],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#18191C]">
      <div className="border-b border-white/8 p-3">
        <Button
          onClick={onCreateCommand}
          className="w-full justify-start gap-2 bg-[#5865F2] text-white hover:bg-[#4752C4]"
          size="sm"
        >
          <Plus className="size-4" aria-hidden="true" />
          Create New Command
        </Button>
      </div>

      <Tabs defaultValue="nodes" className="flex min-h-0 flex-1 flex-col">
        <div className="px-3 pt-3">
          <TabsList className="grid w-full grid-cols-3 bg-[#111214]">
            <TabsTrigger value="nodes">Nodes</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="nodes" className="mt-0 flex min-h-0 flex-1 flex-col">
          <div className="p-3">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#B5BAC1]"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search nodes…"
                aria-label="Search nodes"
                className="h-9 bg-[#111214] pl-8 text-[13px]"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
            {CATEGORY_ORDER.map((cat) => {
              const defs = filtered.filter((d) => d.category === cat);
              if (!defs.length) return null;
              const meta = CATEGORY_META[cat];
              const isCollapsed = collapsed[cat] && !query;
              return (
                <section key={cat} className="mb-3">
                  <button
                    type="button"
                    onClick={() => setCollapsed((c) => ({ ...c, [cat]: !c[cat] }))}
                    className="mb-1.5 flex w-full items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#B5BAC1] hover:text-[#F2F3F5]"
                  >
                    <ChevronRight
                      className={cn("size-3 transition-transform", !isCollapsed && "rotate-90")}
                      aria-hidden="true"
                    />
                    <span className="size-1.5 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
                    {meta.label}
                    <span className="ml-auto text-[#72767d]">{defs.length}</span>
                  </button>
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-1 overflow-hidden"
                      >
                        {defs.map((def) => {
                          const Icon = nodeIcon(def.icon);
                          return (
                            <div
                              key={def.type}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData("application/bottly-node", def.type);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDoubleClick={() => onAddNode(def.type)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") onAddNode(def.type);
                              }}
                              title="Drag onto the canvas, or double-click to add"
                              className="group flex cursor-grab items-start gap-2 rounded-md border border-transparent bg-[#1E1F22] p-2 transition hover:border-white/10 hover:bg-[#232428] active:cursor-grabbing"
                            >
                              <span
                                className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-[5px]"
                                style={{ background: `${meta.color}22`, color: meta.color }}
                              >
                                <Icon className="size-3.5" aria-hidden="true" />
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-[12.5px] font-medium text-[#F2F3F5]">
                                  {def.title}
                                </span>
                                <span className="block truncate text-[11px] text-[#B5BAC1]">{def.description}</span>
                              </span>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              );
            })}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-[12px] text-[#B5BAC1]">No nodes match “{query}”.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="examples" className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-3">
          {exampleCategories.map((cat) => (
            <section key={cat} className="mb-4">
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#B5BAC1]">{cat}</h3>
              <div className="space-y-2">
                {FLOW_EXAMPLES.filter((e) => e.category === cat).map((ex) => (
                  <article
                    key={ex.id}
                    className="rounded-md border border-white/8 bg-[#1E1F22] p-3 transition hover:border-[#5865F2]/50"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-3.5 text-[#7C5CFC]" aria-hidden="true" />
                      <h4 className="text-[13px] font-semibold text-[#F2F3F5]">{ex.title}</h4>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-[#5865F2]">{ex.command}</p>
                    <ul className="mt-2 space-y-0.5">
                      {ex.steps.map((s) => (
                        <li key={s} className="flex items-center gap-1.5 text-[11px] text-[#B5BAC1]">
                          <span className="size-1 rounded-full bg-[#4E5058]" aria-hidden="true" />
                          {s}
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2.5 h-7 w-full bg-[#2B2D31] text-[12px] text-[#F2F3F5] hover:bg-[#35373C]"
                      onClick={() => onUseExample(ex.id)}
                    >
                      Use Example
                    </Button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </TabsContent>

        <TabsContent value="templates" className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-3">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-[#B5BAC1]">
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
              <p className="text-[12px]">Loading templates…</p>
            </div>
          )}
          {error && (
            <p className="py-8 text-center text-[12px] text-destructive">
              Could not load templates.
            </p>
          )}
          {!isLoading && !error && templateCategories.length === 0 && (
            <p className="py-8 text-center text-[12px] text-[#B5BAC1]">No templates available.</p>
          )}
          {templateCategories.map((cat) => (
            <section key={cat} className="mb-4">
              <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#B5BAC1]">
                {cat}
              </h3>
              <div className="space-y-2">
                {(templates ?? [])
                  .filter((t) => t.category === cat)
                  .map((t) => (
                    <article
                      key={t.id}
                      className="rounded-md border border-white/8 bg-[#1E1F22] p-3 transition hover:border-[#5865F2]/50"
                    >
                      <div className="flex items-center gap-2">
                        <LayoutTemplate className="size-3.5 text-[#5865F2]" aria-hidden="true" />
                        <h4 className="text-[13px] font-semibold text-[#F2F3F5]">{t.name}</h4>
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#B5BAC1]">{t.description}</p>
                      <p className="mt-1.5 text-[10px] text-[#72767d]">
                        {t.nodeCount} nodes · {t.edgeCount} edges
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2.5 h-7 w-full bg-[#2B2D31] text-[12px] text-[#F2F3F5] hover:bg-[#35373C]"
                        onClick={() => onUseTemplate(t.id)}
                      >
                        Use template
                      </Button>
                    </article>
                  ))}
              </div>
            </section>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
