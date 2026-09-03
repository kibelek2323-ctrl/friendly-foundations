import { useState } from "react";
import { ChevronDown, Server } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { listUserGuilds, listGuildChannels, listGuildRoles } from "@/lib/discord.functions";
import type { DiscordGuild, DiscordChannel, DiscordRole } from "@/lib/discord.functions";

interface Props {
  onSelect: (payload: { guild: DiscordGuild; channels: DiscordChannel[]; roles: DiscordRole[] }) => void;
}

export function DiscordServerPicker({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [guildId, setGuildId] = useState<string | null>(null);
  const listGuilds = useServerFn(listUserGuilds);
  const listChannels = useServerFn(listGuildChannels);
  const listRoles = useServerFn(listGuildRoles);

  const { data: guildsData, isLoading } = useQuery({
    queryKey: ["discord-guilds"],
    queryFn: () => listGuilds(),
  });

  const guilds = guildsData?.guilds ?? [];

  async function pickGuild(guild: DiscordGuild) {
    setGuildId(guild.id);
    const [{ channels }, { roles }] = await Promise.all([
      listChannels({ data: { guildId: guild.id } }),
      listRoles({ data: { guildId: guild.id } }),
    ]);
    onSelect({ guild, channels, roles });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Server className="size-4" aria-hidden="true" />
          {guildId ? "Change server" : "Import Discord server"}
          <ChevronDown className="size-3 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search servers…" />
          <CommandList>
            <CommandEmpty>{isLoading ? "Loading servers…" : "No servers found."}</CommandEmpty>
            <CommandGroup>
              {guilds.map((g) => (
                <CommandItem key={g.id} value={g.name} onSelect={() => pickGuild(g)} className="gap-2">
                  {g.icon ? (
                    <img src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`} alt="" className="size-5 rounded-full" />
                  ) : (
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#5865F2] text-[10px] font-bold text-white">
                      {g.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="flex-1 truncate">{g.name}</span>
                  {g.owner && <span className="text-[10px] text-muted-foreground">Owner</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
