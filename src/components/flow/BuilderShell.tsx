import { useCallback, useEffect, useMemo, useState } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FlowTopBar } from "@/components/flow/FlowTopBar";
import { NodeLibrary } from "@/components/flow/NodeLibrary";
import { FlowCanvas } from "@/components/flow/FlowCanvas";
import { NodeInspector } from "@/components/flow/NodeInspector";
import { DiscordPreviewPanel } from "@/components/flow/DiscordPreviewPanel";
import { TestPanel } from "@/components/flow/TestPanel";
import { AiAssistantPanel } from "@/components/flow/AiAssistantPanel";
import { useFlowStore } from "@/stores/useFlowStore";
import { createCommandFlowNodes } from "@/data/flow-factories";
import { slugify } from "@/lib/id";
import { FLOW_EXAMPLES } from "@/data/flow-examples";
import { instantiateTemplate } from "@/lib/templates.functions";
import { useIsMobile } from "@/hooks/use-mobile";

const ONBOARDING = [
  { title: "Node Library", body: "Drag any node from the left panel onto the canvas." },
  { title: "Canvas", body: "Connect node outputs to inputs to define your bot's logic." },
  { title: "Properties", body: "Select a node to configure it in the right inspector." },
  { title: "Preview", body: "Embeds and components render live as a real Discord message." },
  { title: "Examples", body: "Start from a prebuilt workflow in the Examples tab." },
];

function BuilderInner({ flowId }: { flowId?: string | undefined }) {
  const ensureFlow = useFlowStore((s) => s.ensureFlow);
  const flows = useFlowStore((s) => s.flows);
  const currentId = useFlowStore((s) => s.currentId);
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const hydrated = useFlowStore((s) => s.hydrated);
  const addPreparedNode = useFlowStore((s) => s.addPreparedNode);
  const addNode = useFlowStore((s) => s.addNode);
  const applyExample = useFlowStore((s) => s.applyExample);
  const deleteNodes = useFlowStore((s) => s.deleteNodes);
  const duplicateNodes = useFlowStore((s) => s.duplicateNodes);
  const copy = useFlowStore((s) => s.copy);
  const paste = useFlowStore((s) => s.paste);
  const undo = useFlowStore((s) => s.undo);
  const redo = useFlowStore((s) => s.redo);
  const save = useFlowStore((s) => s.save);
  const onboarded = useFlowStore((s) => s.onboarded);
  const markOnboarded = useFlowStore((s) => s.markOnboarded);

  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { fitView } = useReactFlow();
  const instantiateTemplateFn = useServerFn(instantiateTemplate);

  const [ready, setReady] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandName, setCommandName] = useState("ban");
  const [commandDesc, setCommandDesc] = useState("Ban a member from the server.");
  const [pendingExample, setPendingExample] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [tourActive, setTourActive] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    ensureFlow(flowId);
    setReady(true);
  }, [ensureFlow, flowId, hydrated]);

  useEffect(() => {
    if (ready && !onboarded) setTourActive(true);
  }, [ready, onboarded]);

  const selected = useMemo(() => nodes.find((n) => n.selected), [nodes]);
  const selectedIds = useMemo(() => nodes.filter((n) => n.selected).map((n) => n.id), [nodes]);

  useEffect(() => {
    if (isMobile && selected) setInspectorOpen(true);
  }, [isMobile, selected]);

  const createCommand = useCallback(() => {
    const name = slugify(commandName) || "command";
    const node = createCommandFlowNodes(name, commandDesc);
    const maxY = nodes.length ? Math.max(...nodes.map((n) => n.position.y)) + 220 : 0;
    node.position = { x: 0, y: maxY };
    addPreparedNode(node);
    setCommandOpen(false);
    toast.success(`/${name} created`, { description: "Configure its options in the inspector." });
    setTimeout(() => fitView({ padding: 0.25, duration: 350 }), 60);
  }, [commandName, commandDesc, nodes, addPreparedNode, fitView]);

  const confirmExample = useCallback(
    (mode: "append" | "replace") => {
      if (!pendingExample) return;
      applyExample(pendingExample, mode);
      setPendingExample(null);
      setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 80);
      toast.success("Workflow added to canvas");
    },
    [pendingExample, applyExample, fitView],
  );

  const handleUseTemplate = useCallback(
    async (templateId: string) => {
      try {
        const { flowId, name } = await instantiateTemplateFn({ data: { templateId } });
        toast.success("Created flow from template", { description: name });
        void navigate({ to: "/builder/$flowId", params: { flowId } });
      } catch (e) {
        toast.error("Could not create flow from template", {
          description: e instanceof Error ? e.message : "Unknown error",
        });
      }
    },
    [instantiateTemplateFn, navigate],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
        toast.success("Flow saved");
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (typing) return;
      if (mod && e.key.toLowerCase() === "c") {
        copy(selectedIds);
        return;
      }
      if (mod && e.key.toLowerCase() === "v") {
        paste();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateNodes(selectedIds);
        return;
      }
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setLibraryOpen(true);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length) {
        e.preventDefault();
        deleteNodes(selectedIds);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [copy, paste, duplicateNodes, deleteNodes, redo, undo, save, selectedIds]);

  const flowName = (currentId && flows[currentId]?.name) || "Untitled flow";

  const library = (
    <NodeLibrary
      onCreateCommand={() => {
        setCommandOpen(true);
        setLibraryOpen(false);
      }}
      onUseExample={(id) => {
        setPendingExample(id);
        setLibraryOpen(false);
      }}
      onUseTemplate={(id) => {
        void handleUseTemplate(id);
        setLibraryOpen(false);
      }}
      onAddNode={(type) => {
        addNode(type, { x: 40, y: (nodes.length ? Math.max(...nodes.map((n) => n.position.y)) + 200 : 0) });
        setLibraryOpen(false);
      }}
    />
  );

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#111214] text-[#F2F3F5]">
      <FlowTopBar
        flowName={flowName}
        previewOpen={previewOpen}
        onTogglePreview={() => setPreviewOpen((p) => !p)}
        onToggleLibrary={() => setLibraryOpen(true)}
        onToggleTest={() => setTestOpen((p) => !p)}
        aiOpen={aiOpen}
        onToggleAi={() => setAiOpen((p) => !p)}
      />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-white/8 lg:block">{library}</aside>

        {aiOpen && (
          <aside className="hidden w-[320px] shrink-0 border-r border-white/8 md:block">
            <AiAssistantPanel onClose={() => setAiOpen(false)} />
          </aside>
        )}

        <main className="relative min-w-0 flex-1">
          <FlowCanvas
            onCreateCommand={() => setCommandOpen(true)}
            onBrowseExamples={() => (isMobile ? setLibraryOpen(true) : setPendingExample(FLOW_EXAMPLES[0]!.id))}
          />
        </main>

        {previewOpen && (
          <aside className={aiOpen ? "hidden w-[340px] shrink-0 border-l border-white/8 2xl:block" : "hidden w-[340px] shrink-0 border-l border-white/8 xl:block"}>
            <DiscordPreviewPanel nodes={nodes} selected={selected} />
          </aside>
        )}

        <aside className={aiOpen ? "hidden w-[320px] shrink-0 border-l border-white/8 lg:block" : "hidden w-[320px] shrink-0 border-l border-white/8 md:block"}>
          <NodeInspector node={selected} />
        </aside>
      </div>

      {/* Mobile drawers */}
      <Sheet open={libraryOpen} onOpenChange={setLibraryOpen}>
        <SheetContent side="left" className="w-72 border-white/8 bg-[#18191C] p-0">
          <SheetTitle className="sr-only">Node library</SheetTitle>
          {library}
        </SheetContent>
      </Sheet>

      <Sheet open={aiOpen && isMobile} onOpenChange={setAiOpen}>
        <SheetContent side="left" className="w-[min(24rem,100vw)] border-white/8 bg-[#18191C] p-0">
          <SheetTitle className="sr-only">Asystent AI</SheetTitle>
          <AiAssistantPanel onClose={() => setAiOpen(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={inspectorOpen && isMobile} onOpenChange={setInspectorOpen}>
        <SheetContent side="right" className="w-80 border-white/8 bg-[#18191C] p-0">
          <SheetTitle className="sr-only">Node properties</SheetTitle>
          <NodeInspector node={selected} />
        </SheetContent>
      </Sheet>

      {currentId && (
        <TestPanel
          flow={flows[currentId] ?? { id: currentId, name: flowName, description: "", nodes, edges, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }}
          open={testOpen}
          onOpenChange={setTestOpen}
        />
      )}

      {/* Create command dialog */}
      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Command</DialogTitle>
            <DialogDescription>A slash command trigger node will be added to your canvas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="cmd-name">Command name</Label>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm text-muted-foreground">/</span>
                <Input
                  id="cmd-name"
                  value={commandName}
                  onChange={(e) => setCommandName(e.target.value)}
                  placeholder="ban"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cmd-desc">Description</Label>
              <Textarea
                id="cmd-desc"
                rows={2}
                value={commandDesc}
                onChange={(e) => setCommandDesc(e.target.value)}
                placeholder="Ban a member from the server."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCommandOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createCommand} className="bg-[#5865F2] text-white hover:bg-[#4752C4]">
              Create command
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Example confirmation */}
      <AlertDialog open={pendingExample !== null} onOpenChange={(o) => !o && setPendingExample(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add this workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              {nodes.length > 0
                ? "Add it alongside your current nodes, or replace the canvas entirely."
                : "All nodes and connections will be placed on your canvas."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {nodes.length > 0 && (
              <Button variant="secondary" onClick={() => confirmExample("replace")}>
                Replace canvas
              </Button>
            )}
            <AlertDialogAction onClick={() => confirmExample("append")}>Add workflow</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Onboarding */}
      <AnimatePresence>
        {tourActive && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-16 left-1/2 z-50 w-[min(320px,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-white/10 bg-[#1E1F22] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] sm:bottom-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#5865F2]">
              Step {tourStep + 1} of {ONBOARDING.length}
            </p>
            <h3 className="mt-1 text-[14px] font-semibold text-[#F2F3F5]">{ONBOARDING[tourStep]!.title}</h3>
            <p className="mt-1 text-[12px] text-[#B5BAC1]">{ONBOARDING[tourStep]!.body}</p>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[12px] text-[#B5BAC1]"
                onClick={() => {
                  setTourActive(false);
                  markOnboarded();
                }}
              >
                Skip tutorial
              </Button>
              <Button
                size="sm"
                className="h-7 bg-[#5865F2] text-[12px] text-white hover:bg-[#4752C4]"
                onClick={() => {
                  if (tourStep === ONBOARDING.length - 1) {
                    setTourActive(false);
                    markOnboarded();
                  } else setTourStep((s) => s + 1);
                }}
              >
                {tourStep === ONBOARDING.length - 1 ? "Start building" : "Next"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BuilderShell({ flowId }: { flowId?: string | undefined }) {
  return (
    <ReactFlowProvider>
      <BuilderInner flowId={flowId} />
    </ReactFlowProvider>
  );
}
