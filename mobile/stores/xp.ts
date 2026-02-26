import { create } from "zustand";
import { api } from "../lib/api";
import type { XPData } from "../lib/types";

interface XPState {
  totalXp: number;
  level: number;
  cefr: string;
  xpForNext: number;
  streakDays: number;
  loaded: boolean;
  fetchXp: () => Promise<void>;
}

export const useXpStore = create<XPState>((set) => ({
  totalXp: 0,
  level: 1,
  cefr: "A1",
  xpForNext: 50,
  streakDays: 0,
  loaded: false,
  fetchXp: async () => {
    try {
      const data = await api.get<XPData>("/stats/xp");
      set({
        totalXp: data.total_xp,
        level: data.level,
        cefr: data.cefr,
        xpForNext: data.xp_for_next,
        streakDays: data.streak_days,
        loaded: true,
      });
    } catch { /* ignore */ }
  },
}));
