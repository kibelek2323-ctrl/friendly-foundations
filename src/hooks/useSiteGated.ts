import { useEffect, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { siteGateQueryOptions } from "@/lib/site-gate.query";

/** Must match the key used by CountdownGate when the maintenance password is entered. */
const UNLOCK_KEY = "bottly-maintenance-unlock";

/**
 * True while the site gate (countdown or maintenance) is active for this visitor.
 * Entering the maintenance password unlocks maintenance for the browser session,
 * so chrome (navbar, back links) renders normally again.
 */
export function useSiteGated() {
  const { data: gate } = useSuspenseQuery(siteGateQueryOptions);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    try {
      setUnlocked(window.sessionStorage.getItem(UNLOCK_KEY) === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const countdown = gate.countdown;
  const maintenance = gate.maintenance;
  const countdownUp = countdown.enabled && Date.now() < countdown.launchAt;
  return countdownUp || (maintenance.enabled && !unlocked);
}
