import { queryOptions } from "@tanstack/react-query";
import { getSiteGate } from "./countdown.functions";

export const siteGateQueryOptions = queryOptions({
  queryKey: ["site-gate"],
  queryFn: () => getSiteGate(),
  staleTime: 60 * 1000,
});
