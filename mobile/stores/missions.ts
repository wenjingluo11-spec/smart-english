import { create } from "zustand";
import { api } from "../lib/api";
import type { Mission } from "../lib/types";

interface MissionsState {
  missions: Mission[];
  loaded: boolean;
  fetchMissions: () => Promise<void>;
}

export const useMissionsStore = create<MissionsState>((set) => ({
  missions: [],
  loaded: false,
  fetchMissions: async () => {
    try {
      const data = await api.get<Mission[]>("/stats/daily-missions");
      set({ missions: data, loaded: true });
    } catch { /* ignore */ }
  },
}));
