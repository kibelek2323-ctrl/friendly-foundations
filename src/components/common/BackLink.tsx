import { useCanGoBack, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { siteGateQueryOptions } from "@/lib/site-gate.query";

/**
 * "Back" control that returns to the previous page when there is history,
 * and falls back to the homepage on a cold entry (direct link, new tab).
 * Hidden while the countdown or maintenance gate is active, because the shell
 * already renders a floating back button in that state.
 */
export function BackLink({ className, label = "Back" }: { className?: string; label?: string }) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const { data: gate } = useSuspenseQuery(siteGateQueryOptions);

  const countdown = gate.countdown;
  const maintenance = gate.maintenance;
  const gated = (countdown.enabled && Date.now() < countdown.launchAt) || maintenance.enabled;

  if (gated) return null;

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
