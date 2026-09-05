import { useCanGoBack, useRouter, useRouterState } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Back" control that returns to the previous page when there is history,
 * and falls back to the homepage on a cold entry (direct link, new tab).
 * Hidden when the countdown/maintenance gate already shows its own back button.
 */
export function BackLink({ className, label = "Back" }: { className?: string; label?: string }) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const fromGate = useRouterState({
    select: (s) => {
      const from = new URLSearchParams(s.location.search).get("from");
      return from === "maintenance" || from === "countdown";
    },
  });

  if (fromGate) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (canGoBack) router.history.back();
        else void router.navigate({ to: "/" });
      }}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </button>
  );
}
