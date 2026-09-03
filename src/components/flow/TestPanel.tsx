import { useMemo, useState } from "react";
import { Play, X, Terminal, MessageSquare, MousePointerClick, ListFilter, UserPlus, Bug } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DiscordMessagePreview } from "@/components/discord/DiscordMessagePreview";
import {
  runFlow,
  defaultSimulationContext,
  type RunResult,
  type SimulationContext,
  type RunRequest,
} from "@/lib/flow-engine";
import { defaultDesign } from "@/data/factories";
import type { Flow } from "@/types/flow";
import { cn } from "@/lib/utils";

interface Props {
  flow: Flow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TRIGGERS = [
  { value: "slash-command", label: "Slash command", icon: Terminal },
  { value: "message", label: "Message", icon: MessageSquare },
  { value: "button", label: "Button", icon: MousePointerClick },
  { value: "dropdown", label: "Dropdown", icon: ListFilter },
  { value: "member-join", label: "Member joined", icon: UserPlus },
];

export function TestPanel({ flow, open, onOpenChange }: Props) {
  const [trigger, setTrigger] = useState("slash-command");
  const [input, setInput] = useState("/welcome");
  const [context, setContext] = useState<SimulationContext>(defaultSimulationContext());
  const [result, setResult] = useState<RunResult | null>(null);

  const design = useMemo(() => defaultDesign(flow.name || "Bottly Bot"), [flow.name]);

  function run() {
    const request: { trigger: RunRequest["trigger"]; command?: string; args?: string[]; message?: string; customId?: string; context: SimulationContext } = {
      trigger: trigger as RunRequest["trigger"],
      context,
    };

    if (trigger === "slash-command") {
      const parts = input.trim().replace(/^\//, "").split(/\s+/);
      request.command = parts[0] ?? "";
      request.args = parts.slice(1);
    } else if (trigger === "message") {
      request.message = input;
    } else if (trigger === "button" || trigger === "dropdown") {
      request.customId = input.trim();
    }

    setResult(runFlow(flow, request));
  }

  const combinedMessage = useMemo(() => {
    if (!result || result.messages.length === 0) return null;
    const first = result.messages[0]!;
    return {
      content: first.content,
      embeds: first.embeds,
      components: first.components,
      channel: first.channel,
    };
  }, [result]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col border-l border-white/8 bg-[#18191C] p-0 sm:max-w-md">
        <SheetHeader className="border-b border-white/8 px-4 py-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-[15px] font-semibold text-[#F2F3F5]">
              <Bug className="size-4 text-[#5865F2]" aria-hidden="true" />
              Test runner
            </SheetTitle>
            <Button variant="ghost" size="icon" className="size-7 text-[#B5BAC1]" onClick={() => onOpenChange(false)}>
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <Tabs value={trigger} onValueChange={setTrigger} className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-white/8 px-4 py-3">
              <TabsList className="grid h-8 grid-cols-5 bg-[#111214]">
                {TRIGGERS.map((t) => (
                  <TabsTrigger key={t.value} value={t.value} className="px-1 text-[10px]" title={t.label}>
                    <t.icon className="size-3.5" aria-hidden="true" />
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <div className="space-y-3 px-4 py-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#B5BAC1]">
                  {trigger === "slash-command" && "Command input"}
                  {trigger === "message" && "Message content"}
                  {trigger === "button" && "Button custom ID"}
                  {trigger === "dropdown" && "Select custom ID"}
                  {trigger === "member-join" && "(no input required)"}
                </Label>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={trigger === "member-join"}
                  placeholder={
                    trigger === "slash-command"
                      ? "/warn @user spam"
                      : trigger === "message"
                        ? "Hello bot"
                        : "custom_id"
                  }
                  className="h-8 border-white/8 bg-[#1E1F22] text-[13px] text-[#F2F3F5]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-[#B5BAC1]">User context</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    value={context.user.username}
                    onChange={(e) =>
                      setContext((c) => ({
                        ...c,
                        user: { ...c.user, username: e.target.value, displayName: e.target.value },
                      }))
                    }
                    placeholder="Username"
                    className="h-8 border-white/8 bg-[#1E1F22] text-[13px] text-[#F2F3F5]"
                  />
                  <Input
                    value={context.user.roles.join(", ")}
                    onChange={(e) =>
                      setContext((c) => ({
                        ...c,
                        user: { ...c.user, roles: e.target.value.split(",").map((r) => r.trim()) },
                      }))
                    }
                    placeholder="Roles (comma separated)"
                    className="h-8 border-white/8 bg-[#1E1F22] text-[13px] text-[#F2F3F5]"
                  />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="perm-admin"
                      checked={context.user.permissions.includes("Administrator")}
                      onCheckedChange={(checked) =>
                        setContext((c) => {
                          const perms = new Set(c.user.permissions);
                          if (checked) perms.add("Administrator");
                          else perms.delete("Administrator");
                          return { ...c, user: { ...c.user, permissions: Array.from(perms) } };
                        })
                      }
                    />
                    <Label htmlFor="perm-admin" className="text-[11px] text-[#B5BAC1]">
                      Administrator
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="perm-mod"
                      checked={context.user.permissions.includes("BanMembers")}
                      onCheckedChange={(checked) =>
                        setContext((c) => {
                          const perms = new Set(c.user.permissions);
                          if (checked) perms.add("BanMembers");
                          else perms.delete("BanMembers");
                          return { ...c, user: { ...c.user, permissions: Array.from(perms) } };
                        })
                      }
                    />
                    <Label htmlFor="perm-mod" className="text-[11px] text-[#B5BAC1]">
                      Ban members
                    </Label>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#B5BAC1]">Channel</Label>
                  <Input
                    value={context.channel.name}
                    onChange={(e) => setContext((c) => ({ ...c, channel: { ...c.channel, name: e.target.value } }))}
                    className="h-8 border-white/8 bg-[#1E1F22] text-[13px] text-[#F2F3F5]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] text-[#B5BAC1]">Server</Label>
                  <Input
                    value={context.server.name}
                    onChange={(e) => setContext((c) => ({ ...c, server: { ...c.server, name: e.target.value } }))}
                    className="h-8 border-white/8 bg-[#1E1F22] text-[13px] text-[#F2F3F5]"
                  />
                </div>
              </div>

              <Button onClick={run} className="w-full gap-1.5 bg-[#5865F2] text-white hover:bg-[#4752C4]">
                <Play className="size-4" aria-hidden="true" />
                Run simulation
              </Button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col border-t border-white/8">
              <TabsContent value={trigger} className="mt-0 flex min-h-0 flex-1 flex-col">
                {result && (
                  <div className="flex min-h-0 flex-1 flex-col">
                    <div className="border-b border-white/8 px-4 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-[#F2F3F5]">Result</span>
                        <Badge
                          variant={result.matched ? "default" : "secondary"}
                          className={cn(
                            "h-5 text-[10px]",
                            result.matched ? "bg-[#23A55A] text-white" : "bg-[#F0B232] text-black",
                          )}
                        >
                          {result.matched ? "Matched" : "No trigger"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-[#B5BAC1]">
                        {result.steps.length} steps · {result.messages.length} messages · {result.durationMs}ms
                      </p>
                    </div>

                    {combinedMessage ? (
                      <div className="border-b border-white/8 p-3">
                        <div className="h-72 overflow-hidden rounded-lg border border-white/8">
                          <DiscordMessagePreview
                            design={{
                              ...design,
                              messageContent: combinedMessage.content,
                              embeds: combinedMessage.embeds,
                            }}
                            components={combinedMessage.components}
                            channelName={combinedMessage.channel?.replace(/^#/, "") ?? "general"}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="px-4 py-3 text-[12px] text-[#B5BAC1]">No message output.</p>
                    )}

                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#B5BAC1]">Steps</p>
                      <ol className="space-y-2">
                        {result.steps.map((s, i) => (
                          <li key={`${s.nodeId}-${i}`} className="rounded-md bg-[#1E1F22] p-2.5 text-[12px]">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-[#F2F3F5]">{s.nodeTitle}</span>
                              {s.branch && (
                                <Badge className="h-4 text-[10px]" variant="outline">
                                  {s.branch}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-[#B5BAC1]">{s.description}</p>
                          </li>
                        ))}
                      </ol>
                      {result.logs.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#B5BAC1]">Logs</p>
                          <ul className="space-y-1 text-[11px] text-[#B5BAC1]">
                            {result.logs.map((l, i) => (
                              <li key={i} className="font-mono">{l}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {!result && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center text-[#B5BAC1]">
                    <Play className="size-6 opacity-50" aria-hidden="true" />
                    <p className="text-sm">Configure the input and click Run to simulate the flow.</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
