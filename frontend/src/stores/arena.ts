import { create } from "zustand";
import { api } from "@/lib/api";

interface BattleMode {
  mode: string; name: string; description: string; rounds: number;
}

interface Battle {
  id: number; mode: string; player1_id: number; player2_id: number | null;
  status: string; rounds: { rounds: { round: number; p1_input: string; p2_input: string; p1_score: number; p2_score: number; p1_feedback?: string; p2_feedback?: string }[]; current_round: number; max_rounds: number } | null;
  winner_id: number | null; created_at: string;
}

interface Rating {
  rating: number; tier: string; wins: number; losses: number; season: number;
}

interface LeaderboardEntry {
  user_id: number; phone: string; rating: number; tier: string; wins: number;
}

interface ArenaState {
  modes: BattleMode[];
  currentBattle: Battle | null;
  lastRoundResult: Record<string, unknown> | null;
  rating: Rating | null;
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
  modes: [], currentBattle: null, lastRoundResult: null, rating: null,
  leaderboard: [], history: [], loading: false,

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
    const data = await api.get<Rating>("/arena/rating");
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
