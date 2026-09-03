import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { Json } from "@/integrations/supabase/types";
import { uid } from "@/lib/id";
import type { Flow, FlowEdge, FlowNode } from "@/types/flow";

export interface PublicFlowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  nodeCount: number;
  edgeCount: number;
}

interface FullFlowTemplate extends PublicFlowTemplate {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

function createPublishableClient() {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables for public reads');
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith('sb_') && h.get('Authorization') === `Bearer ${key}`) {
          h.delete('Authorization');
        }
        h.set('apikey', key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

function parseFullTemplate(row: Database['public']['Tables']['flow_templates']['Row']): FullFlowTemplate {
  const nodes = Array.isArray(row.nodes) ? (row.nodes as unknown as FlowNode[]) : [];
  const edges = Array.isArray(row.edges) ? (row.edges as unknown as FlowEdge[]) : [];
  return {
    ...row,
    nodes,
    edges,
    nodeCount: nodes.length,
    edgeCount: edges.length,
  };
}

export const listPublicTemplates = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createPublishableClient();
  const { data, error } = await supabase
    .from("flow_templates")
    .select("*")
    .eq("is_public", true)
    .order("category", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const full = parseFullTemplate(row);
    const { nodes: _nodes, edges: _edges, ...rest } = full;
    return rest;
  });
});

export const instantiateTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { templateId: string; name?: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error: fetchError } = await supabase
      .from("flow_templates")
      .select("*")
      .eq("id", data.templateId)
      .eq("is_public", true)
      .single();
    if (fetchError || !row) throw new Error("Template not found");

    const template = parseFullTemplate(row);
    const flowId = uid("flow");
    const now = new Date().toISOString();
    const flow: Flow = {
      id: flowId,
      name: data.name || `${template.name} copy`,
      description: template.description,
      nodes: structuredClone(template.nodes),
      edges: structuredClone(template.edges),
      createdAt: now,
      updatedAt: now,
    };

    const { error: insertError } = await supabase.from("flows").insert({
      id: flowId,
      user_id: userId,
      name: flow.name,
      data: flow as unknown as Json,
    });
    if (insertError) throw insertError;

    return { flowId: flow.id, name: flow.name };
  });
