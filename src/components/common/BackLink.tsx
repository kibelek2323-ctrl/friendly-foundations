import { useCanGoBack, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { cn } from "@/lib/utils";
import { DEFAULT_COUNTDOWN, DEFAULT_MAINTENANCE, getSiteGate } from "@/lib/countdown.functions";

/**
 * "Back" control that returns to the previous page when there is history,
 * and falls back to the homepage on a cold entry (direct link, new tab).
 * Hidden while the countdown or maintenance gate is active, because the shell
 * already renders a floating back button in that state.
 */
export function BackLink({ className, label = "Back" }: { className?: string; label?: string }) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const loadGate = useServerFn(getSiteGate);

  const { data: gate } = useQuery({
    queryKey: ["site-gate"],
    queryFn: () => loadGate(),
    staleTime: 60 * 1000,
  });

  const countdown = gate?.countdown ?? DEFAULT_COUNTDOWN;
  const maintenance = gate?.maintenance ?? DEFAULT_MAINTENANCE;
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
