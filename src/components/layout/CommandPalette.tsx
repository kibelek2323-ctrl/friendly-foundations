import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Bot as BotIcon, LayoutDashboard, Plus, Palette, Workflow, Terminal, Settings, ScrollText, BookOpen, CreditCard } from "lucide-react";
import { useBotStore } from "@/stores/useBotStore";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const bots = useBotStore((s) => s.bots);
  const [query, setQuery] = useState("");

  const go = (to: string) => {
    onOpenChange(false);
    setQuery("");
    void navigate({ to });
  };

  const firstBot = bots[0];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search bots, commands, automations, logs…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("/bots/new")}>
            <Plus /> Create Bot
          </CommandItem>
          {firstBot && (
            <>
              <CommandItem onSelect={() => go(`/bots/${firstBot.id}/commands`)}>
                <Terminal /> Create Command
              </CommandItem>
              <CommandItem onSelect={() => go(`/bots/${firstBot.id}/presence`)}>
                <Palette /> Open Presence
              </CommandItem>
              <CommandItem onSelect={() => go(`/bots/${firstBot.id}/automations`)}>
                <Workflow /> Open Automations
              </CommandItem>
              <CommandItem onSelect={() => go(`/bots/${firstBot.id}/settings`)}>
                <Settings /> Settings
              </CommandItem>
            </>
          )}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/dashboard")}>
            <LayoutDashboard /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/bots")}>
            <BotIcon /> My Bots
          </CommandItem>
          <CommandItem onSelect={() => go("/docs")}>
            <BookOpen /> Documentation
          </CommandItem>
          <CommandItem onSelect={() => go("/pricing")}>
            <CreditCard /> Pricing
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Bots">
          {bots.map((b) => (
            <CommandItem key={b.id} value={`bot ${b.name}`} onSelect={() => go(`/bots/${b.id}`)}>
              <BotIcon /> {b.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Commands">
          {bots.flatMap((b) =>
            b.commands.slice(0, 6).map((c) => (
              <CommandItem key={`${b.id}-${c.id}`} value={`command /${c.name} ${b.name}`} onSelect={() => go(`/bots/${b.id}/commands`)}>
                <Terminal /> /{c.name}
                <span className="ml-auto text-xs text-muted-foreground">{b.name}</span>
              </CommandItem>
            )),
          )}
        </CommandGroup>
        <CommandGroup heading="Automations">
          {bots.flatMap((b) =>
            b.automations.map((a) => (
              <CommandItem key={`${b.id}-${a.id}`} value={`automation ${a.name} ${b.name}`} onSelect={() => go(`/bots/${b.id}/automations`)}>
                <Workflow /> {a.name}
                <span className="ml-auto text-xs text-muted-foreground">{b.name}</span>
              </CommandItem>
            )),
          )}
        </CommandGroup>
        <CommandGroup heading="Logs">
          {bots.flatMap((b) =>
            b.logs.slice(0, 3).map((l) => (
              <CommandItem key={`${b.id}-${l.id}`} value={`log ${l.event} ${l.description}`} onSelect={() => go(`/bots/${b.id}/logs`)}>
                <ScrollText /> {l.event}
                <span className="ml-auto truncate text-xs text-muted-foreground">{b.name}</span>
              </CommandItem>
            )),
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}
