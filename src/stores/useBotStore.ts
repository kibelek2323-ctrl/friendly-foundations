import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Bot, LogEntry, WizardDraft } from "@/types/bot";
import { draftToBot, emptyDraft } from "@/data/factories";
import { stripBotSecrets } from "@/lib/sanitize-bot";

import { uid } from "@/lib/id";

export type SaveState = "idle" | "saving" | "saved" | "error";

interface BotStore {
  bots: Bot[];
  draft: WizardDraft;
  saveState: SaveState;
  hydrated: boolean;
  setSaveState: (s: SaveState) => void;
  /** Wizard */
  updateDraft: (patch: Partial<WizardDraft>) => void;
  resetDraft: () => void;
  commitDraft: () => Bot;
  /** Bots */
  addBot: (bot: Bot) => void;
  updateBot: (id: string, patch: Partial<Bot>) => void;
  duplicateBot: (id: string) => Bot | undefined;
  deleteBot: (id: string) => void;
  getBot: (id: string) => Bot | undefined;
  pushLog: (botId: string, entry: Omit<LogEntry, "id" | "timestamp">) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let clearTimer: ReturnType<typeof setTimeout> | undefined;

function markSaving(set: (patch: Partial<BotStore>) => void) {
  set({ saveState: "saving" });
  if (saveTimer) clearTimeout(saveTimer);
  if (clearTimer) clearTimeout(clearTimer);
  saveTimer = setTimeout(() => {
    set({ saveState: "saved" });
    clearTimer = setTimeout(() => set({ saveState: "idle" }), 2200);
  }, 550);
}

export const useBotStore = create<BotStore>()(
  persist(
    (set, get) => ({
      bots: [],
      draft: emptyDraft(),
      saveState: "idle",
      hydrated: false,

      setSaveState: (saveState) => set({ saveState }),

      updateDraft: (patch) => {
        set({ draft: { ...get().draft, ...patch } });
        markSaving(set);
      },
      resetDraft: () => set({ draft: emptyDraft() }),
      commitDraft: () => {
        const bot = draftToBot(get().draft);
        set({ bots: [bot, ...get().bots], draft: emptyDraft() });
        return bot;
      },

      addBot: (bot) => set({ bots: [bot, ...get().bots] }),
      updateBot: (id, patch) => {
        set({
          bots: get().bots.map((b) =>
            b.id === id ? { ...b, ...patch, updatedAt: new Date().toISOString() } : b,
          ),
        });
        markSaving(set);
      },
      duplicateBot: (id) => {
        const source = get().bots.find((b) => b.id === id);
        if (!source) return undefined;
        const copy: Bot = {
          ...structuredClone(source),
          id: uid("bot"),
          name: `${source.name} (copy)`,
          username: `${source.username}-copy`,
          status: "offline",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set({ bots: [copy, ...get().bots] });
        return copy;
      },
      deleteBot: (id) => {
        set({ bots: get().bots.filter((b) => b.id !== id) });
        void import("@/lib/cloud-sync").then((m) => m.deleteRemoteBot(id));
      },
      getBot: (id) => get().bots.find((b) => b.id === id),

      pushLog: (botId, entry) =>
        set({
          bots: get().bots.map((b) =>
            b.id === botId
              ? {
                  ...b,
                  logs: [{ ...entry, id: uid("log"), timestamp: new Date().toISOString() }, ...b.logs],
                }
              : b,
          ),
        }),
    }),
    {
      name: "bottly.workspace.v1",
      // v2 removed bot tokens from persisted state; see migrate() below.
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // Bot tokens must never be written to localStorage.
      partialize: (state) => ({ bots: state.bots.map(stripBotSecrets), draft: state.draft }),
      // Drops plaintext tokens left behind by pre-v2 builds on first rehydrate.
      migrate: (persisted) => {
        const previous = (persisted ?? {}) as { bots?: unknown; draft?: WizardDraft };
        const bots = Array.isArray(previous.bots)
          ? (previous.bots as Bot[]).map(stripBotSecrets)
          : [];
        return { ...previous, bots } as unknown as BotStore;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.hydrated = true;
      },
    },
  ),
);
