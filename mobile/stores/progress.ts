import { create } from "zustand";
import { api } from "../lib/api";
import type { ProgressData } from "../lib/types";

interface ProgressState {
  dueVocab: number;
  todayPractice: number;
  writingCount: number;
  errorCount: number;
  loaded: boolean;
  fetchProgress: () => Promise<void>;
}

export const useProgressStore = create<ProgressState>((set) => ({
  dueVocab: 0,
  todayPractice: 0,
  writingCount: 0,
  errorCount: 0,
  loaded: false,
  fetchProgress: async () => {
    try {
      const data = await api.get<ProgressData>("/stats/module-progress");
      set({
        dueVocab: data.due_vocab,
        todayPractice: data.today_practice,
        writingCount: data.writing_count,
        errorCount: data.error_count ?? 0,
        loaded: true,
      });
    } catch { /* ignore */ }
  },
}));
