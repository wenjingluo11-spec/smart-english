import { create } from "zustand";
import { api } from "../lib/api";
import type { ErrorPattern, TreatmentPlan } from "../lib/types";

interface ClinicState {
  patterns: ErrorPattern[];
  currentPlan: TreatmentPlan | null;
  diagnosing: boolean;
  summary: string;
  diagnose: () => Promise<void>;
  fetchPatterns: () => Promise<void>;
  startTreatment: (patternId: number) => Promise<void>;
  submitExercise: (planId: number, index: number, answer: string) => Promise<Record<string, unknown>>;
}

export const useClinicStore = create<ClinicState>((set, get) => ({
  patterns: [],
  currentPlan: null,
  diagnosing: false,
  summary: "",

  diagnose: async () => {
    set({ diagnosing: true });
    try {
      const data = await api.post<{ patterns: ErrorPattern[]; summary: string }>("/clinic/diagnose", {});
      set({ patterns: data.patterns, summary: data.summary, diagnosing: false });
    } catch {
      set({ diagnosing: false });
    }
  },

  fetchPatterns: async () => {
    try {
      const data = await api.get<ErrorPattern[]>("/clinic/patterns");
      set({ patterns: data });
    } catch { /* ignore */ }
  },

  startTreatment: async (patternId) => {
    try {
      const data = await api.post<TreatmentPlan>(`/clinic/treat/${patternId}`, {});
      set({ currentPlan: data });
    } catch { /* ignore */ }
  },

  submitExercise: async (planId, index, answer) => {
    const res = await api.post<Record<string, unknown>>("/clinic/exercise", {
      plan_id: planId, exercise_index: index, answer,
    });
    if (res.plan_completed) {
      set({ currentPlan: null });
      get().fetchPatterns();
    }
    return res;
  },
}));
