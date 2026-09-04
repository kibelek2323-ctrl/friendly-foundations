import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Code2, Loader2, Workflow } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIMEZONES } from "@/data/catalog";
import { CREATION_STEPS } from "@/services/discord";
import { useBotStore } from "@/stores/useBotStore";
import { useFlowStore } from "@/stores/useFlowStore";
import { slugify } from "@/lib/id";
import { listPublicTemplates, instantiateTemplate } from "@/lib/templates.functions";
import { usePlan } from "@/hooks/usePlan";
import { myAccountRank } from "@/lib/roles.functions";
import { createCodeProject } from "@/lib/code-projects.functions";
import { PLAN_LABEL } from "@/data/plan-limits";
import type { BotLanguage } from "@/types/bot";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bots/new")({
  head: () => ({
    meta: [
      { title: "Create a Discord bot — Bottly" },
      { name: "description", content: "Pick a plan, add the basics and jump straight into the visual flow builder." },
      { property: "og:title", content: "Create a Discord bot — Bottly" },
      {
        property: "og:description",
        content: "Two quick steps — plan and basics — then build your bot visually on Bottly's canvas.",
      },
    ],
  }),
  component: Page,
});

const FLOW_STEPS = ["Template", "Basics"];
const CODE_STEPS = ["Basics"];

function CreatingOverlay({ onDone }: { onDone: () => void | Promise<void> }) {
  const [index, setIndex] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (index >= CREATION_STEPS.length) {
      if (doneRef.current) return;
      doneRef.current = true;
      onDone();
      return;
    }
    const step = CREATION_STEPS[index]!;
    const t = setTimeout(() => setIndex((i) => i + 1), step.duration);
    return () => clearTimeout(t);
  }, [index, onDone]);

  const pct = Math.round((index / CREATION_STEPS.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6 text-center">
        <Loader2 className="mx-auto size-8 animate-spin text-primary" aria-hidden="true" />
        <p aria-live="polite" className="text-sm font-medium">
          {CREATION_STEPS[Math.min(index, CREATION_STEPS.length - 1)]?.label}
        </p>
        <Progress value={pct} />
      </div>
    </div>
  );
}

function Page() {
  const draft = useBotStore((s) => s.draft);
  const updateDraft = useBotStore((s) => s.updateDraft);
  const commitDraft = useBotStore((s) => s.commitDraft);
  const updateBot = useBotStore((s) => s.updateBot);
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [method, setMethod] = useState<"flow" | "code" | null>(null);

  const listTemplates = useServerFn(listPublicTemplates);
  const instantiateTemplateFn = useServerFn(instantiateTemplate);
  const { data: templates, isLoading } = useQuery({
    queryKey: ["flow-templates"],
    queryFn: () => listTemplates(),
    staleTime: 5 * 60 * 1000,
  });

  const { plan, limits, botCount, canCreateBot } = usePlan();
  const rank = useQuery({ queryKey: ["account-rank"], queryFn: () => myAccountRank() });
  const isDeveloper = rank.data?.developer === true;
  const createProject = useServerFn(createCodeProject);

  const mode: "flow" | "code" = isDeveloper ? (method ?? "flow") : "flow";
  const STEPS = mode === "code" ? CODE_STEPS : FLOW_STEPS;

  const step = Math.min(draft.step, STEPS.length - 1);
  const setStep = (n: number) => updateDraft({ step: Math.max(0, Math.min(STEPS.length - 1, n)) });

  const validate = () => {
    if (step !== STEPS.length - 1) return true;
    const next: Record<string, string> = {};
    if (!draft.name.trim()) next["name"] = "Give your bot a name.";
    if (!slugify(draft.username)) next["username"] = "A username is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const finish = async () => {
    try {
      const bot = commitDraft();
      if (mode === "code") {
        const result = await createProject({ data: { botId: bot.id, name: bot.name, runtime: "javascript" } });
        if (!result.ok || !result.project) throw new Error(result.error ?? "Could not create the project.");
        toast.success(`${bot.name} saved to your account`, { description: "Opening the Code Editor…" });
        void navigate({ to: "/projects/$projectId/code", params: { projectId: result.project.id } });
        return;
      }
      let flowId: string;
      if (templateId) {
        const result = await instantiateTemplateFn({
          data: { templateId, name: `${bot.name} — main flow` },
        });
        flowId = result.flowId;
      } else {
        flowId = useFlowStore.getState().newFlow(`${bot.name} — main flow`);
      }
      updateBot(bot.id, { flowId });
      toast.success(`${bot.name} saved to your account`, { description: "Opening the flow builder…" });
      void navigate({ to: "/builder/$flowId", params: { flowId } });
    } catch (e) {
      toast.error("Could not create bot", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
      setCreating(false);
    }
  };

  return (
    <AppShell title="Create bot" actions={<span />}>
      <div className="mx-auto max-w-[1400px] space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-xl font-semibold">Create a new bot</h1>
          <p className="text-sm text-muted-foreground">
            Step {step + 1} of {STEPS.length} — {STEPS[step]}.{" "}
            {mode === "code" ? "Then you jump straight into the Code Editor." : "Everything else is built visually in the flow builder."}
          </p>
        </div>

        {!canCreateBot && (
          <div className="panel flex flex-wrap items-center gap-3 border-warning/40 bg-warning/10 p-4">
            <p className="min-w-0 flex-1 text-sm">
              You reached the bot limit of the {PLAN_LABEL[plan]} plan ({botCount}/{limits.bots}). Redeem a code for a
              higher plan to create another bot.
            </p>
            <Button variant="outline" size="sm" onClick={() => void navigate({ to: "/billing" })}>
              Aktywuj plan
            </Button>
          </div>
        )}

        {isDeveloper && method === null && (
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setMethod("flow");
                updateDraft({ step: 0 });
              }}
              className="panel p-6 text-left transition hover:-translate-y-0.5 hover:border-primary"
            >
              <Workflow className="size-6 text-primary" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">Flow Builder</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Visual bot builder for creating bots without writing code.
              </p>
            </button>
            <button
              type="button"
              onClick={() => {
                setMethod("code");
                updateDraft({ step: 0 });
              }}
              className="panel p-6 text-left transition hover:-translate-y-0.5 hover:border-primary"
            >
              <Code2 className="size-6 text-primary" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">Code Editor</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Build and customise your bot using source code, stored in Bottly Storage.
              </p>
            </button>
          </div>
        )}

        {(!isDeveloper || method !== null) && (
        <ol className="flex flex-wrap gap-2" aria-label="Progress">
          {STEPS.map((label, i) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => i <= step && setStep(i)}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs transition",
                  i === step && "border-primary bg-primary/15 text-primary",
                  i < step && "text-success",
                )}
              >
                {i < step ? <Check className="size-3" aria-hidden="true" /> : <span>{i + 1}</span>}
                {label}
              </button>
            </li>
          ))}
        </ol>
        )}

        {(!isDeveloper || method !== null) && (
        <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {mode === "flow" && step === 0 && (
            <div className="mx-auto max-w-3xl">
              <p className="mb-4 text-sm text-muted-foreground">
                Start from a prebuilt workflow, or skip this step to begin with a blank canvas.
              </p>
              {isLoading && (
                <div className="flex flex-col items-center justify-center gap-2 py-12">
                  <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">Loading templates…</p>
                </div>
              )}
              {!isLoading && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setTemplateId(null)}
                    className={cn(
                      "panel flex flex-col items-center justify-center gap-2 p-5 text-center transition hover:border-primary/60",
                      templateId === null && "border-primary ring-1 ring-primary",
                    )}
                  >
                    <span className="flex size-10 items-center justify-center rounded-full border border-dashed border-border bg-elevated text-muted-foreground">
                      <Check className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold">Blank canvas</span>
                    <span className="text-xs text-muted-foreground">Build your flow from scratch</span>
                  </button>
                  {(templates ?? []).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTemplateId(t.id)}
                      className={cn(
                        "panel p-5 text-left transition hover:border-primary/60",
                        templateId === t.id && "border-primary ring-1 ring-primary",
                      )}
                    >
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t.category}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{t.description}</p>
                      <p className="mt-3 text-[10px] text-muted-foreground">
                        {t.nodeCount} nodes · {t.edgeCount} edges
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {STEPS[step] === "Basics" && (
            <div className="grid max-w-2xl gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="w-name">Bot name</Label>
                <Input
                  id="w-name"
                  value={draft.name}
                  aria-invalid={!!errors["name"]}
                  onChange={(e) =>
                    updateDraft({
                      name: e.target.value,
                      username: slugify(e.target.value),
                      design: { ...draft.design, botName: e.target.value || "Bottly Bot" },
                    })
                  }
                />
                {errors["name"] && <p className="text-xs text-destructive">{errors["name"]}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-username">Username</Label>
                <Input
                  id="w-username"
                  value={draft.username}
                  aria-invalid={!!errors["username"]}
                  onChange={(e) => updateDraft({ username: slugify(e.target.value) })}
                />
                {errors["username"] && <p className="text-xs text-destructive">{errors["username"]}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-desc">Description</Label>
                <Textarea id="w-desc" rows={3} value={draft.description} onChange={(e) => updateDraft({ description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-avatar">Avatar URL</Label>
                <Input
                  id="w-avatar"
                  value={draft.avatar}
                  placeholder="https://…/avatar.png"
                  onChange={(e) => updateDraft({ avatar: e.target.value, design: { ...draft.design, botAvatar: e.target.value } })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {mode === "code" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="w-lang">Runtime</Label>
                    <Select value={draft.language} onValueChange={(v) => updateDraft({ language: v as BotLanguage })}>
                      <SelectTrigger id="w-lang">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript (discord.js)</SelectItem>
                        <SelectItem value="python">Python (discord.py)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="w-tz">Timezone</Label>
                  <Select value={draft.timezone} onValueChange={(v) => updateDraft({ timezone: v })}>
                    <SelectTrigger id="w-tz">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </motion.div>
        )}

        {(!isDeveloper || method !== null) && (
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button variant="outline" className="gap-1.5" disabled={step === 0} onClick={() => setStep(step - 1)}>
            <ArrowLeft className="size-4" /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button
              className="gap-1.5"
              onClick={() => {
                if (validate()) setStep(step + 1);
              }}
            >
              Continue <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              className="gap-1.5"
              disabled={!canCreateBot}
              onClick={() => {
                if (!canCreateBot) return;
                if (validate()) setCreating(true);
              }}
            >
              Save & open builder <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
        )}
      </div>

      {creating && <CreatingOverlay onDone={finish} />}
    </AppShell>
  );
}
