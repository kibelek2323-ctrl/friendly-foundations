import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getBotRuntimeEvents } from "@/lib/bot-runtime.functions";
import type { RuntimeEventRecord } from "@/types/runtime";

export interface UseRuntimeEventsResult {
  events: RuntimeEventRecord[];
  loading: boolean;
  failed: boolean;
  refresh: () => Promise<void>;
}

/**
 * Server-side runtime activity for one bot.
 *
 * These entries come from the runtime service (bot_runtime_events), so unlike
 * the locally stored bot logs they survive a browser change.
 */
export function useRuntimeEvents(botId: string, limit = 100): UseRuntimeEventsResult {
  const fetchEvents = useServerFn(getBotRuntimeEvents);
  const [events, setEvents] = useState<RuntimeEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const aliveRef = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchEvents({ data: { botId, limit } });
      if (aliveRef.current) {
        setEvents(next);
        setFailed(false);
      }
    } catch {
      if (aliveRef.current) setFailed(true);
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, [botId, fetchEvents, limit]);

  useEffect(() => {
    aliveRef.current = true;
    void refresh();
    return () => {
      aliveRef.current = false;
    };
  }, [refresh]);

  return { events, loading, failed, refresh };
}