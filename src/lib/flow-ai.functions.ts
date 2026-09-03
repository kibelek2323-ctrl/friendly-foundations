import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { NODE_DEFS } from "@/data/node-catalog";
import { PLAN_LIMITS } from "@/data/plan-limits";
import type { PlanId } from "@/types/bot";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8000),
});

const graphNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  config: z.record(z.string(), z.unknown()).optional(),
});

const inputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(40),
  graph: z.object({
    nodes: z.array(graphNodeSchema).max(200),
    edges: z.array(z.object({ source: z.string(), target: z.string() })).max(400),
  }),
});

export interface AiPlanNode {
  key: string;
  type: string;
  title: string;
  config: Record<string, string>;
}

export interface AiPlanEdge {
  from: string;
  to: string;
  fromHandle: string | null;
}

export interface AiFlowPlan {
  summary: string;
  mode: "append" | "replace";
  nodes: AiPlanNode[];
  edges: AiPlanEdge[];
}

export interface AiFlowResult {
  reply: string;
  plan: AiFlowPlan | null;
  /** Remaining AI messages for today after this request. */
  remaining: number;
}

const outputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "plan"],
  properties: {
    reply: { type: "string" },
    plan: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["summary", "mode", "nodes", "edges"],
      properties: {
        summary: { type: "string" },
        mode: { type: "string", enum: ["append", "replace"] },
        nodes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "type", "title", "config"],
            properties: {
              key: { type: "string" },
              type: { type: "string" },
              title: { type: "string" },
              config: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["key", "value"],
                  properties: { key: { type: "string" }, value: { type: "string" } },
                },
              },
            },
          },
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["from", "to", "fromHandle"],
            properties: {
              from: { type: "string" },
              to: { type: "string" },
              fromHandle: { type: ["string", "null"] },
            },
          },
        },
      },
    },
  },
} as const;

function catalogSummary() {
  return NODE_DEFS.map((d) => {
    const fields = d.fields.map((f) => `${f.key}:${f.kind}`).join(", ");
    return `- ${d.type} (${d.category}) outputs=[${d.outputs.join("|")}] fields=[${fields}] — ${d.description}`;
  }).join("\n");
}

const rawPlanSchema = z.object({
  reply: z.string(),
  plan: z
    .object({
      summary: z.string(),
      mode: z.enum(["append", "replace"]),
      nodes: z.array(
        z.object({
          key: z.string(),
          type: z.string(),
          title: z.string(),
          config: z.array(z.object({ key: z.string(), value: z.string() })).default([]),
        }),
      ),
      edges: z.array(
        z.object({
          from: z.string(),
          to: z.string(),
          fromHandle: z.string().nullable().default(null),
        }),
      ),
    })
    .nullable(),
});

export const askFlowAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<AiFlowResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const { supabase, userId } = context;

    // Daily AI limit based on the account plan.
    const { data: planRow } = await supabase
      .from("user_plans")
      .select("plan, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    const expired = planRow?.expires_at ? new Date(planRow.expires_at).getTime() < Date.now() : false;
    const planId: PlanId = expired ? "free" : ((planRow?.plan as PlanId | undefined) ?? "free");
    const dailyLimit = PLAN_LIMITS[planId].aiPerDay;

    const { data: used } = await supabase.rpc("bump_ai_usage", { _user_id: userId });
    const usedToday = typeof used === "number" ? used : dailyLimit;
    const remaining = Math.max(0, dailyLimit - usedToday);

    if (usedToday > dailyLimit) {
      throw new Error(
        `You've used your daily AI message limit (${dailyLimit}) on the ${planId} plan. It resets tomorrow, or redeem a higher plan at /billing.`,
      );
    }

    const validTypes = new Set(NODE_DEFS.map((d) => d.type));

    const system = [
      "You are Bottly's flow assistant, an expert on building Discord bots in a visual node editor.",
      "Always answer in English.",
      "You can propose changes to the user's flow canvas by returning a `plan`.",
      "Only use node types from this catalog — never invent a type:",
      catalogSummary(),
      "",
      "Rules for plans:",
      "- Every flow must start from a trigger node (category `triggers`).",
      "- `key` is a temporary local id you invent; edges reference those keys, or an existing node id from the current graph.",
      "- `fromHandle` must be one of the source node's outputs (usually \"out\"; conditions have \"true\"/\"false\").",
      "- `config` entries must use field keys from the catalog for that node type. Values are plain strings.",
      "- Use mode \"append\" to add to the canvas, \"replace\" only when the user explicitly wants to start over.",
      "- Set `plan` to null when the user only asks a question, wants an explanation or a review.",
      "- Keep `reply` short and helpful (markdown allowed). `summary` is one sentence describing the change.",
      "",
      "Current canvas graph (JSON):",
      JSON.stringify(data.graph),
    ].join("\n");

    const input = [
      { role: "system", content: [{ type: "input_text", text: system }] },
      ...data.messages.map((m) => ({
        role: m.role,
        content: [{ type: m.role === "assistant" ? "output_text" : "input_text", text: m.content }],
      })),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.6-sol",
        input,
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        text: {
          format: {
            type: "json_schema",
            name: "flow_assistant",
            strict: true,
            schema: outputJsonSchema,
          },
        },
      }),
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("The AI is busy right now — please try again in a moment.");
      if (res.status === 402) throw new Error("No AI credits left in this project.");
      throw new Error(text || `AI request failed (${res.status})`);
    }

    // Accumulate the SSE stream server-side; only the final JSON matters here.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let output = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as { type?: string; delta?: string };
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            output += evt.delta;
          }
        } catch {
          // ignore keep-alive / partial frames
        }
      }
    }

    if (!output.trim()) {
      return { reply: "I could not generate a response. Try rephrasing your request.", plan: null, remaining };
    }

    let parsed: z.infer<typeof rawPlanSchema>;
    try {
      parsed = rawPlanSchema.parse(JSON.parse(output));
    } catch {
      return { reply: output.slice(0, 4000), plan: null, remaining };
    }

    if (!parsed.plan) return { reply: parsed.reply, plan: null, remaining };

    const nodes: AiPlanNode[] = parsed.plan.nodes
      .filter((n) => validTypes.has(n.type))
      .map((n) => ({
        key: n.key,
        type: n.type,
        title: n.title,
        config: Object.fromEntries(n.config.map((c) => [c.key, c.value])),
      }));

    const knownKeys = new Set([...nodes.map((n) => n.key), ...data.graph.nodes.map((n) => n.id)]);
    const edges: AiPlanEdge[] = parsed.plan.edges
      .filter((e) => knownKeys.has(e.from) && knownKeys.has(e.to))
      .map((e) => ({ from: e.from, to: e.to, fromHandle: e.fromHandle }));

    if (!nodes.length) return { reply: parsed.reply, plan: null, remaining };

    return {
      reply: parsed.reply,
      plan: { summary: parsed.plan.summary, mode: parsed.plan.mode, nodes, edges },
      remaining,
    };
  });
