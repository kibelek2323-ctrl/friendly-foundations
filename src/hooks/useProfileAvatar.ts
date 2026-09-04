import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDiscordConnection } from "@/lib/discord.functions";
import { getMyProfile } from "@/lib/creators.functions";
import { useAuthStore } from "@/stores/useAuthStore";
import { useHydrated } from "@/hooks/useHydrated";

/**
 * Avatar + display name for the signed-in user. A custom uploaded avatar
 * (profiles.avatar_url) wins over the linked Discord avatar.
 */
export function useProfileAvatar() {
  const hydrated = useHydrated();
  const user = useAuthStore((s) => s.user);
  const getConnection = useServerFn(getDiscordConnection);
  const fetchProfile = useServerFn(getMyProfile);

  const { data } = useQuery({
    queryKey: ["discord-connection"],
    queryFn: () => getConnection(),
    enabled: hydrated && !!user,
    staleTime: 5 * 60 * 1000,
  });
  const { data: profile } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
    enabled: hydrated && !!user,
    staleTime: 60 * 1000,
  });

  const connection = data?.connection ?? null;

  return {
    avatarUrl: profile?.avatarUrl ?? connection?.avatar_url ?? user?.avatarUrl ?? null,
    displayName: profile?.displayName || connection?.username || user?.name || null,
    discordUsername: connection?.username ?? null,
  };
}
