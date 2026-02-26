import { create } from "zustand";
import { api } from "../lib/api";
import type { BattleMode, Battle, ArenaRating, LeaderboardEntry } from "../lib/types";

interface ArenaState {
  modes: BattleMode[];
  currentBattle: Battle | null;
  lastRoundResult: Record<string, unknown> | null;
  rating: ArenaRating | null;
  leaderboard: LeaderboardEntry[];
  history: Battle[];
  loading: boolean;
  fetchModes: () => Promise<void>;
  startBattle: (mode: string) => Promise<void>;
  submitRound: (battleId: number, input: string) => Promise<void>;
  fetchRating: () => Promise<void>;
  fetchLeaderboard: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  clearBattle: () => void;
}

export const useArenaStore = create<ArenaState>((set) => ({
  modes: [],
  currentBattle: null,
  lastRoundResult: null,
  rating: null,
  leaderboard: [],
  history: [],
  loading: false,

  fetchModes: async () => {
    const data = await api.get<BattleMode[]>("/arena/modes");
    set({ modes: data });
  },

  startBattle: async (mode) => {
    set({ loading: true, lastRoundResult: null });
    const data = await api.post<Battle>("/arena/battle", { mode });
    set({ currentBattle: data, loading: false });
  },

  submitRound: async (battleId, input) => {
    set({ loading: true });
    const data = await api.post<Battle & { round_result: Record<string, unknown> }>(
      `/arena/battle/${battleId}/round?user_input=${encodeURIComponent(input)}`, {}
    );
    set({ currentBattle: data, lastRoundResult: data.round_result, loading: false });
  },

  fetchRating: async () => {
    const data = await api.get<ArenaRating>("/arena/rating");
    set({ rating: data });
  },

  fetchLeaderboard: async () => {
    const data = await api.get<LeaderboardEntry[]>("/arena/leaderboard");
    set({ leaderboard: data });
  },

  fetchHistory: async () => {
    const data = await api.get<Battle[]>("/arena/history");
    set({ history: data });
  },

  clearBattle: () => set({ currentBattle: null, lastRoundResult: null }),
}));
