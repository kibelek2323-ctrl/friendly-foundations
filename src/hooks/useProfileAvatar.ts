import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDiscordConnection } from "@/lib/discord.functions";
import { useAuthStore } from "@/stores/useAuthStore";
import { useHydrated } from "@/hooks/useHydrated";

/** Avatar + display name for the signed-in user, preferring their linked Discord profile. */
export function useProfileAvatar() {
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const getConnection = useServerFn(getDiscordConnection);

  const { data } = useQuery({
    queryKey: ["discord-connection"],
    queryFn: () => getConnection(),
    enabled: hydrated && !!user,
    staleTime: 5 * 60 * 1000,
  });

  const connection = data?.connection ?? null;

  return {
    avatarUrl: connection?.avatar_url ?? user?.avatarUrl ?? null,
    displayName: connection?.username ?? user?.name ?? null,
    discordUsername: connection?.username ?? null,
  };
}
