import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFlowStore } from "@/stores/useFlowStore";
import { askFlowAssistant, type AiFlowPlan } from "@/lib/flow-ai.functions";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  plan?: AiFlowPlan | null;
  applied?: boolean;
  dismissed?: boolean;
}

const SUGGESTIONS = [
  "Build a ticket system with a button",
  "Add a /ban command with confirmation",
  "Explain my flow and find issues",
];

function Bubble({ role, children }: { role: ChatMessage["role"]; children: React.ReactNode }) {
  return (
    <div
      className={
        role === "user"
          ? "ml-auto max-w-[85%] rounded-lg rounded-br-sm bg-[#5865F2] px-3 py-2 text-[13px] leading-relaxed text-white"
          : "max-w-[92%] rounded-lg rounded-bl-sm bg-[#2B2D31] px-3 py-2 text-[13px] leading-relaxed text-[#DBDEE1]"
      }
    >
      {children}
    </div>
  );
}

export function AiAssistantPanel({ onClose }: { onClose?: (() => void) | undefined }) {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const applyAiPlan = useFlowStore((s) => s.applyAiPlan);
  const ask = useServerFn(askFlowAssistant);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || busy) return;
      const history = [...messages, { id: crypto.randomUUID(), role: "user" as const, content }];
      setMessages(history);
      setInput("");
      setBusy(true);
      try {
        const result = await ask({
          data: {
            messages: history.map((m) => ({ role: m.role, content: m.content })),
            graph: {
              nodes: nodes.map((n) => ({
                id: n.id,
                type: n.data.type,
                title: n.data.title,
                config: n.data.config,
              })),
              edges: edges.map((e) => ({ source: e.source, target: e.target })),
            },
          },
        });
        setRemaining(result.remaining);
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: result.reply, plan: result.plan },
        ]);
      } catch (e) {
        toast.error("The AI assistant did not respond", {
          description: e instanceof Error ? e.message : "Unknown error",
        });
      } finally {
        setBusy(false);
      }
    },
    [ask, busy, edges, messages, nodes],
  );

  const apply = useCallback(
    (id: string, plan: AiFlowPlan) => {
      applyAiPlan(plan);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, applied: true } : m)));
      toast.success("Zmiany zastosowane na kanwie", { description: "Cofniesz je przez Ctrl+Z." });
    },
    [applyAiPlan],
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#18191C]">
      <div className="flex h-13 shrink-0 items-center gap-2 border-b border-white/8 px-3">
        <span className="flex size-6 items-center justify-center rounded-md bg-[#5865F2]/20 text-[#8b95ff]">
          <Sparkles className="size-3.5" aria-hidden="true" />
        </span>
        <h2 className="flex-1 text-[13px] font-semibold text-[#F2F3F5]">AI Assistant</h2>
        {remaining !== null && (
          <span
            className="rounded-full bg-white/6 px-2 py-0.5 text-[11px] font-medium text-[#B5BAC1]"
            title="Remaining AI messages today"
          >
            {remaining} left
          </span>
        )}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-[#B5BAC1] hover:bg-white/8 hover:text-[#F2F3F5]"
            onClick={onClose}
            aria-label="Zamknij asystenta"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-[12px] leading-relaxed text-[#B5BAC1]">
              Describe what your bot should do — I'll build or improve the flow on the canvas. Nothing changes
              without your approval.
            </p>
            <div className="space-y-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="w-full rounded-md border border-white/8 bg-[#2B2D31] px-3 py-2 text-left text-[12px] text-[#DBDEE1] transition hover:border-[#5865F2]/60 hover:bg-[#35373C]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className="space-y-2">
            <Bubble role={m.role}>
              <span className="whitespace-pre-wrap">{m.content}</span>
            </Bubble>
            {m.role === "assistant" && m.plan && !m.dismissed && (
              <div className="rounded-lg border border-[#5865F2]/40 bg-[#5865F2]/8 p-3">
                <p className="text-[12px] font-medium text-[#F2F3F5]">{m.plan.summary}</p>
                <p className="mt-1 text-[11px] text-[#B5BAC1]">
                  {m.plan.nodes.length} nodes · {m.plan.edges.length} connections ·{" "}
                  {m.plan.mode === "replace" ? "replaces the canvas" : "adds to the canvas"}
                </p>
                {m.applied ? (
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[#23A55A]">
                    <Check className="size-3.5" aria-hidden="true" /> Zastosowano
                  </p>
                ) : (
                  <div className="mt-2.5 flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 bg-[#5865F2] text-[12px] text-white hover:bg-[#4752C4]"
                      onClick={() => apply(m.id, m.plan!)}
                    >
                      Zastosuj
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[12px] text-[#B5BAC1] hover:text-[#F2F3F5]"
                      onClick={() =>
                        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, dismissed: true } : x)))
                      }
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <AnimatePresence>
          {busy && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Bubble role="assistant">
                <span className="flex items-center gap-2 text-[#B5BAC1]">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> Thinking about your flow…
                </span>
              </Bubble>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <form
        className="shrink-0 border-t border-white/8 p-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={2}
            placeholder="e.g. welcome new members in #welcome"
            aria-label="Message the AI assistant"
            className="min-h-[52px] resize-none border-white/8 bg-[#1E1F22] text-[13px] text-[#F2F3F5] placeholder:text-[#6D6F78]"
          />
          <Button
            type="submit"
            size="icon"
            disabled={busy || !input.trim()}
            className="size-9 shrink-0 bg-[#5865F2] text-white hover:bg-[#4752C4]"
            aria-label="Send"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
