import { useSuspenseQuery } from "@tanstack/react-query";
import { siteGateQueryOptions } from "@/lib/site-gate.query";

/**
 * True while the site gate (countdown or maintenance) is active for this visitor.
 * The maintenance unlock is a server-issued httpOnly cookie reported by the
 * gate query (`unlocked`), so it cannot be forged from the browser.
 */
export function useSiteGated() {
  const { data: gate } = useSuspenseQuery(siteGateQueryOptions);

  const countdown = gate.countdown;
  const maintenance = gate.maintenance;
  const countdownUp = countdown.enabled && Date.now() < countdown.launchAt;
  return countdownUp || (maintenance.enabled && !gate.unlocked);
}
