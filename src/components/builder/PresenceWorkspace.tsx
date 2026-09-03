import type { ActivityType, Bot, BotPresence, PresenceStatus } from "@/types/bot";
import { DEFAULT_PRESENCE } from "@/types/bot";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlan } from "@/hooks/usePlan";
import { cn } from "@/lib/utils";

const STATUSES: { id: PresenceStatus; label: string; color: string }[] = [
  { id: "online", label: "Online", color: "#23A55A" },
  { id: "idle", label: "Idle", color: "#F0B232" },
  { id: "dnd", label: "Do Not Disturb", color: "#F23F43" },
  { id: "invisible", label: "Invisible", color: "#80848E" },
];

const ACTIVITIES: { id: ActivityType; label: string; verb: string }[] = [
  { id: "playing", label: "Playing", verb: "Playing" },
  { id: "streaming", label: "Streaming", verb: "Streaming" },
  { id: "listening", label: "Listening to", verb: "Listening to" },
  { id: "watching", label: "Watching", verb: "Watching" },
  { id: "competing", label: "Competing in", verb: "Competing in" },
  { id: "custom", label: "Custom status", verb: "" },
];

export function PresenceWorkspace({
  bot,
  onChange,
}: {
  bot: Bot;
  onChange: (patch: Partial<Bot>) => void;
}) {
  const { canEditBranding } = usePlan();
  const presence: BotPresence = { ...DEFAULT_PRESENCE, ...(bot.presence ?? {}) };
  const patchPresence = (p: Partial<BotPresence>) => onChange({ presence: { ...presence, ...p } });

  const statusColor = STATUSES.find((s) => s.id === presence.status)?.color ?? "#80848E";
  const activity = ACTIVITIES.find((a) => a.id === presence.activityType) ?? ACTIVITIES[0]!;
  const activityLine =
    presence.activityType === "custom"
      ? presence.activityState || presence.activityName
      : [activity.verb, presence.activityName].filter(Boolean).join(" ");

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <section className="panel space-y-4 p-4" aria-label="Bot identity">
          <h2 className="text-sm font-semibold">Identity</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Display name</Label>
              <Input
                id="p-name"
                value={bot.name}
                onChange={(e) =>
                  onChange({ name: e.target.value, design: { ...bot.design, botName: e.target.value || "Bottly Bot" } })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-username">Username</Label>
              <Input
                id="p-username"
                value={bot.username}
                onChange={(e) => onChange({ username: e.target.value.replace(/^@/, "") })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-avatar">Avatar URL</Label>
            <Input
              id="p-avatar"
              placeholder="https://…/avatar.png"
              value={bot.avatar}
              onChange={(e) => onChange({ avatar: e.target.value, design: { ...bot.design, botAvatar: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-desc">Description</Label>
            <Textarea
              id="p-desc"
              rows={3}
              value={bot.description}
              disabled={!canEditBranding}
              onChange={(e) => onChange({ description: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              {canEditBranding
                ? "Shown on your bot profile and in the app directory."
                : "Editing the description and branding requires the Pro plan — redeem a code in Plan & billing."}
            </p>
          </div>
        </section>

        <section className="panel space-y-4 p-4" aria-label="Presence">
          <h2 className="text-sm font-semibold">Presence</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={presence.status === s.id}
                onClick={() => patchPresence({ status: s.id })}
                className={cn(
                  "flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-left text-xs transition hover:border-primary/60",
                  presence.status === s.id && "border-primary bg-elevated",
                )}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="truncate font-medium">{s.label}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-acttype">Activity type</Label>
              <Select
                value={presence.activityType}
                onValueChange={(v) => patchPresence({ activityType: v as ActivityType })}
              >
                <SelectTrigger id="p-acttype">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITIES.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-actname">{presence.activityType === "custom" ? "Custom text" : "Activity name"}</Label>
              <Input
                id="p-actname"
                value={presence.activityType === "custom" ? presence.activityState : presence.activityName}
                placeholder={presence.activityType === "custom" ? "Building bots with Bottly" : "/help • bottly.app"}
                onChange={(e) =>
                  patchPresence(
                    presence.activityType === "custom"
                      ? { activityState: e.target.value }
                      : { activityName: e.target.value },
                  )
                }
              />
            </div>
          </div>

          {presence.activityType === "streaming" && (
            <div className="space-y-1.5">
              <Label htmlFor="p-stream">Stream URL</Label>
              <Input
                id="p-stream"
                placeholder="https://twitch.tv/…"
                value={presence.streamUrl}
                onChange={(e) => patchPresence({ streamUrl: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="p-about">About me</Label>
            <Textarea
              id="p-about"
              rows={3}
              value={presence.aboutMe}
              placeholder="A short bio shown on the bot's Discord profile."
              onChange={(e) => patchPresence({ aboutMe: e.target.value })}
            />
          </div>
        </section>
      </div>

      {/* Preview */}
      <section aria-label="Presence preview" className="space-y-3">
        <h2 className="text-sm font-semibold">Preview</h2>

        <div className="overflow-hidden rounded-lg bg-[#232428]" style={{ fontFamily: "var(--font-gg, inherit)" }}>
          <div className="h-[60px] w-full" style={{ background: bot.design.accentColor }} />
          <div className="px-4 pb-4">
            <div className="-mt-10 mb-3 inline-flex rounded-full border-[6px] border-[#232428]">
              <span className="relative flex size-20 items-center justify-center overflow-hidden rounded-full bg-[#5865F2] text-2xl font-semibold text-white">
                {bot.avatar ? (
                  <img src={bot.avatar} alt="" className="size-full object-cover" />
                ) : (
                  bot.name.slice(0, 2).toUpperCase()
                )}
              </span>
            </div>
            <div className="rounded-lg bg-[#111214] p-3">
              <div className="flex items-center gap-1.5">
                <p className="text-[20px] font-bold leading-tight text-white">{bot.name || "Bottly Bot"}</p>
                <span className="rounded bg-[#5865F2] px-1 text-[10px] font-semibold uppercase text-white">App</span>
              </div>
              <p className="text-[13px] text-[#B5BAC1]">@{bot.username || "bottly"}</p>
              {activityLine && <p className="mt-1 text-[13px] text-[#DBDEE1]">{activityLine}</p>}

              {(presence.aboutMe || bot.description) && (
                <>
                  <div className="my-3 h-px bg-[#2E3035]" />
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-white">About me</p>
                  <p className="whitespace-pre-wrap text-[13px] leading-[1.15rem] text-[#DBDEE1]">
                    {presence.aboutMe || bot.description}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-[#2B2D31] p-2">
          <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#949BA4]">Online — 1</p>
          <div className="flex items-center gap-2.5 rounded px-2 py-1.5 hover:bg-[#35373C]">
            <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#5865F2] text-xs font-semibold text-white">
              {bot.avatar ? <img src={bot.avatar} alt="" className="size-full object-cover" /> : bot.name.slice(0, 2).toUpperCase()}
              <span
                className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-[3px] border-[#2B2D31]"
                style={{ background: statusColor }}
              />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1">
                <span className="truncate text-[15px] font-medium text-[#F2F3F5]">{bot.name || "Bottly Bot"}</span>
                <span className="rounded bg-[#5865F2] px-1 text-[10px] font-semibold uppercase text-white">App</span>
              </span>
              {activityLine && <span className="block truncate text-[12px] text-[#B5BAC1]">{activityLine}</span>}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
