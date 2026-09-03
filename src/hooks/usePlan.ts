import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyPlan, type MyPlan } from "@/lib/plan.functions";
import { PLAN_LIMITS, type PlanLimits } from "@/data/plan-limits";
import { useBotStore } from "@/stores/useBotStore";
import type { PlanId } from "@/types/bot";

export interface UsePlanResult {
  plan: PlanId;
  limits: PlanLimits;
  data: MyPlan | undefined;
  isLoading: boolean;
  botCount: number;
  aiUsedToday: number;
  aiRemaining: number;
  canCreateBot: boolean;
  canEditBranding: boolean;
  canAddCommand: (current: number) => boolean;
  refetch: () => void;
}

export function usePlan(): UsePlanResult {
  const fetchPlan = useServerFn(getMyPlan);
  const localBots = useBotStore((s) => s.bots.length);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-plan"],
    queryFn: () => fetchPlan(),
    staleTime: 60 * 1000,
  });

  const plan = (data?.plan ?? "free") as PlanId;
  const limits = PLAN_LIMITS[plan];
  const botCount = Math.max(localBots, data?.botCount ?? 0);
  const aiUsedToday = data?.aiUsedToday ?? 0;

  return {
    plan,
    limits,
    data,
    isLoading,
    botCount,
    aiUsedToday,
    aiRemaining: Math.max(0, limits.aiPerDay - aiUsedToday),
    canCreateBot: limits.bots === null || botCount < limits.bots,
    canEditBranding: limits.branding,
    canAddCommand: (current: number) => limits.commands === null || current < limits.commands,
    refetch: () => void refetch(),
  };
}
