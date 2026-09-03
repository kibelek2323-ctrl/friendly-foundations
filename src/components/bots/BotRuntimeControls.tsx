import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Play, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getBotRuntimeStatus,
  startBotRuntime,
  stopBotRuntime,
} from "@/lib/bot-runtime.functions";
import { useBotStore } from "@/stores/useBotStore";
import type { Bot, BotStatus } from "@/types/bot";
import type { BotRuntimeStatus, RuntimeState } from "@/types/runtime";

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 24; // ~60s of transitional state before we stop polling

const STATE_LABEL: Record<RuntimeState, string> = {
  offline: "Offline",
  starting: "Starting…",
  online: "Online",
  stopping: "Stopping…",
  error: "Error",
};

/** Only terminal runtime states are mirrored onto the bot's own status. */
function toBotStatus(state: RuntimeState): BotStatus | null {
  if (state === "online") return "online";
  if (state === "offline" || state === "error") return "offline";
  return null;
}

/**
 * Real start/stop for a bot.
 *
 * The button reflects the runtime service, not local optimism: after a command
 * it keeps polling while the runtime reports a transitional state, so a failed
 * gateway login shows up as "Error" instead of a fake "Online".
 */
export function BotRuntimeControls({
  bot,
  patch,
}: {
  bot: Bot;
  patch: (patch: Partial<Bot>) => void;
}) {
  const fetchStatus = useServerFn(getBotRuntimeStatus);
  const start = useServerFn(startBotRuntime);
  const stop = useServerFn(stopBotRuntime);
  const pushLog = useBotStore((s) => s.pushLog);

  const [status, setStatus] = useState<BotRuntimeStatus | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pending, setPending] = useState<"start" | "stop" | null>(null);

  const aliveRef = useRef(true);
  // Kept in refs so applyStatus can stay referentially stable even though
  // BotPage hands us a fresh `patch` closure on every render.
  const patchRef = useRef(patch);
  const botStatusRef = useRef<BotStatus>(bot.status);

  useEffect(() => {
    patchRef.current = patch;
    botStatusRef.current = bot.status;
  });

  const applyStatus = useCallback((next: BotRuntimeStatus) => {
    setStatus(next);
    const desired = toBotStatus(next.state);
    if (desired && desired !== botStatusRef.current) {
      botStatusRef.current = desired;
      patchRef.current({ status: desired });
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    setStatus(null);
    setLoadFailed(false);

    void fetchStatus({ data: { botId: bot.id } })
      .then((next) => {
        if (aliveRef.current) applyStatus(next);
      })
      .catch(() => {
        if (aliveRef.current) setLoadFailed(true);
      });

    return () => {
      aliveRef.current = false;
    };
  }, [applyStatus, bot.id, fetchStatus]);

  useEffect(() => {
    const state = status?.state;
    if (state !== "starting" && state !== "stopping") return undefined;

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = () => {
      timer = setTimeout(() => {
        attempts += 1;
        void fetchStatus({ data: { botId: bot.id } })
          .then((next) => {
            if (cancelled) return;
            applyStatus(next);
            if (
              (next.state === "starting" || next.state === "stopping") &&
              attempts < MAX_POLLS
            ) {
              poll();
            }
          })
          .catch(() => {
            // Transient: keep the last known state, the next command resyncs.
          });
      }, POLL_INTERVAL_MS);
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [applyStatus, bot.id, fetchStatus, status?.state]);

  const run = async (action: "start" | "stop") => {
    if (pending) return;
    setPending(action);

    try {
      const result =
        action === "start"
          ? await start({ data: { botId: bot.id } })
          : await stop({ data: { botId: bot.id } });

      if (result.status) applyStatus(result.status);

      if (!result.ok) {
        toast.error(
          result.error ??
            (action === "start" ? "Could not start the bot." : "Could not stop the bot."),
        );
        return;
      }

      pushLog(bot.id, {
        event: action === "start" ? "gateway.connect" : "gateway.disconnect",
        level: action === "start" ? "success" : "warning",
        description:
          action === "start"
            ? "Start requested from the dashboard."
            : "Stop requested from the dashboard.",
      });

      toast.success(
        action === "start" ? `Starting ${bot.name}…` : `Stopping ${bot.name}…`,
      );
    } catch {
      toast.error("Could not reach the server. Try again.");
    } finally {
      if (aliveRef.current) setPending(null);
    }
  };

  const state = status?.state ?? null;
  const transitioning = state === "starting" || state === "stopping";
  const busy = pending !== null || transitioning;
  const showStop = state === "online" || state === "starting";

  return (
    <div className="flex min-w-40 flex-col gap-1 sm:items-end">
      <Button
        variant={showStop ? "outline" : "default"}
        className="gap-1.5"
        disabled={busy || status === null}
        onClick={() => void run(showStop ? "stop" : "start")}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : showStop ? (
          <Power className="size-4" aria-hidden="true" />
        ) : (
          <Play className="size-4" aria-hidden="true" />
        )}
        {pending === "start"
          ? "Starting"
          : pending === "stop"
            ? "Stopping"
            : showStop
              ? "Stop bot"
              : "Start bot"}
      </Button>

      <p aria-live="polite" className="min-h-4 text-xs text-muted-foreground">
        {status === null && !loadFailed && "Checking runtime…"}
        {loadFailed && <span className="text-destructive">Runtime status unavailable.</span>}
        {status !== null &&
          `Runtime: ${STATE_LABEL[status.state]}${
            status.guildCount !== null ? ` · ${status.guildCount} servers` : ""
          }`}
      </p>

      {status?.lastError && (
        <p className="max-w-xs text-xs text-destructive sm:text-right">{status.lastError}</p>
      )}
    </div>
  );
}