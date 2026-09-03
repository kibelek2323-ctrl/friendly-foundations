import type { BotStatus } from "@/types/bot";
import { cn } from "@/lib/utils";

const MAP: Record<BotStatus, { label: string; dot: string; text: string }> = {
  online: { label: "Online", dot: "bg-success", text: "text-success" },
  offline: { label: "Offline", dot: "bg-muted-foreground", text: "text-muted-foreground" },
  draft: { label: "Draft", dot: "bg-warning", text: "text-warning" },
};

export function StatusDot({ status, className }: { status: BotStatus; className?: string | undefined }) {
  const cfg = MAP[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", cfg.text, className)}>
      <span className={cn("size-2 rounded-full", cfg.dot)} aria-hidden="true" />
      {cfg.label}
    </span>
  );
}
