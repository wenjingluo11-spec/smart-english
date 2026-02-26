import { create } from "zustand";
import { api } from "@/lib/api";

interface Mission {
  id: number;
  mission_type: string;
  title: string;
  target: number;
  progress: number;
  completed: boolean;
  xp_reward: number;
}

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
    } catch {
      // ignore
    }
  },
}));
