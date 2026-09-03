import { Check, ChevronRight, Loader2, Play, Redo2, Rocket, Save, Undo2, Eye, PanelLeft, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useFlowStore } from "@/stores/useFlowStore";
import { cn } from "@/lib/utils";

interface Props {
  flowName: string;
  previewOpen: boolean;
  onTogglePreview: () => void;
  onToggleLibrary: () => void;
  onToggleTest: () => void;
  aiOpen: boolean;
  onToggleAi: () => void;
}

export function FlowTopBar({
  flowName,
  previewOpen,
  onTogglePreview,
  onToggleLibrary,
  onToggleTest,
  aiOpen,
  onToggleAi,
}: Props) {
  const saveState = useFlowStore((s) => s.saveState);
  const renameFlow = useFlowStore((s) => s.renameFlow);
  const undo = useFlowStore((s) => s.undo);
  const redo = useFlowStore((s) => s.redo);
  const save = useFlowStore((s) => s.save);
  const canUndo = useFlowStore((s) => s.past.length > 0);
  const canRedo = useFlowStore((s) => s.future.length > 0);
  const nodeCount = useFlowStore((s) => s.nodes.length);

  const statusLabel =
    saveState === "saving" ? "Saving…" : saveState === "dirty" ? "Unsaved changes" : "Saved";

  const iconBtn = "size-8 text-[#B5BAC1] hover:bg-white/8 hover:text-[#F2F3F5]";

  return (
    <header className="flex h-13 shrink-0 items-center gap-3 border-b border-white/8 bg-[#18191C] px-3 py-2">
      <Button variant="ghost" size="icon" className={cn(iconBtn, "lg:hidden")} onClick={onToggleLibrary} aria-label="Toggle node library">
        <PanelLeft className="size-4" aria-hidden="true" />
      </Button>

      <Link to="/" className="flex shrink-0 items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-[7px] bg-[#5865F2] text-[13px] font-bold text-white">
          B
        </span>
        <span className="hidden text-[14px] font-semibold text-[#F2F3F5] sm:inline">Bottly</span>
      </Link>

      <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-[12px] text-[#B5BAC1] md:flex">
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span>My Bot</span>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span>Commands</span>
        <ChevronRight className="size-3.5" aria-hidden="true" />
        <span className="text-[#F2F3F5]">{flowName}</span>
      </nav>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
        <input
          value={flowName}
          onChange={(e) => renameFlow(e.target.value)}
          aria-label="Flow name"
          className="w-full min-w-0 max-w-56 rounded-[5px] bg-transparent px-2 py-1 text-center text-[13px] font-semibold text-[#F2F3F5] outline-none transition hover:bg-white/5 focus:bg-white/5"
        />
        <span
          className={cn(
            "hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] lg:flex",
            saveState === "dirty" ? "bg-[#F0B232]/15 text-[#F0B232]" : "bg-white/5 text-[#B5BAC1]",
          )}
          aria-live="polite"
        >
          {saveState === "saving" ? (
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          ) : saveState === "dirty" ? null : (
            <Check className="size-3" aria-hidden="true" />
          )}
          {statusLabel}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className={cn(iconBtn, "hidden sm:inline-flex")} disabled={!canUndo} onClick={undo} aria-label="Undo">
              <Undo2 className="size-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className={cn(iconBtn, "hidden sm:inline-flex")} disabled={!canRedo} onClick={redo} aria-label="Redo">
              <Redo2 className="size-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>
        <span className="mx-1 hidden h-5 w-px bg-white/10 sm:block" aria-hidden="true" />

        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-1.5 text-[12px] text-[#B5BAC1] hover:text-[#F2F3F5]",
            aiOpen && "bg-[#5865F2]/20 text-[#F2F3F5]",
          )}
          onClick={onToggleAi}
          aria-pressed={aiOpen}
        >
          <Sparkles className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">AI</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 gap-1.5 text-[12px] text-[#B5BAC1] hover:text-[#F2F3F5]", previewOpen && "bg-white/8 text-[#F2F3F5]")}
          onClick={onTogglePreview}
          aria-pressed={previewOpen}
        >
          <Eye className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Preview</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hidden h-8 gap-1.5 text-[12px] text-[#B5BAC1] hover:text-[#F2F3F5] sm:inline-flex"
          onClick={onToggleTest}
        >
          <Play className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Test</span>
        </Button>

        <Button
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5 bg-[#2B2D31] text-[12px] text-[#F2F3F5] hover:bg-[#35373C]"
          onClick={() => {
            save();
            toast.success("Flow saved");
          }}
        >
          <Save className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Save</span>
        </Button>
        <Button
          size="sm"
          className="h-8 gap-1.5 bg-[#5865F2] text-[12px] text-white hover:bg-[#4752C4]"
          onClick={() => {
            save();
            toast.success("Deployed to Discord", { description: "Your flow is live on the connected bot." });
          }}
        >
          <Rocket className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Deploy</span>
        </Button>
      </div>
    </header>
  );
}
