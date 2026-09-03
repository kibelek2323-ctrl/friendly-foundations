import { useState } from "react";
import { Link2, Unlink, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getDiscordAuthUrl, disconnectDiscord } from "@/lib/discord.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Props {
  connection: { username: string | null; avatar_url?: string | null } | null | undefined;
}

export function DiscordConnectButton({ connection }: Props) {
  const [loading, setLoading] = useState(false);
  const getUrl = useServerFn(getDiscordAuthUrl);
  const disconnect = useServerFn(disconnectDiscord);
  const queryClient = useQueryClient();

  async function connect() {
    setLoading(true);
    try {
      const { url } = await getUrl();
      window.location.href = url;
    } finally {
      setLoading(false);
    }
  }

  async function unlink() {
    setLoading(true);
    try {
      await disconnect();
      await queryClient.invalidateQueries({ queryKey: ["discord-connection"] });
    } finally {
      setLoading(false);
    }
  }

  if (connection) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={unlink} disabled={loading}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Unlink className="size-4" aria-hidden="true" />}
        Disconnect @{connection.username}
      </Button>
    );
  }

  return (
    <Button size="sm" className="gap-2 bg-[#5865F2] text-white hover:bg-[#4752C4]" onClick={connect} disabled={loading}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" aria-hidden="true" />}
      Connect Discord
    </Button>
  );
}
