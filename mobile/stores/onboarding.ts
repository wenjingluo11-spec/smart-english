import { create } from "zustand";
import { api } from "../lib/api";
import type { OnboardingStatus } from "../lib/types";

interface OnboardingState {
  completed: boolean;
  currentStep: string | null;
  assessmentScore: number | null;
  cefrLevel: string | null;
  recommendedPath: string | null;
  loading: boolean;
  fetchStatus: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  completed: true,
  currentStep: null,
  assessmentScore: null,
  cefrLevel: null,
  recommendedPath: null,
  loading: false,

  fetchStatus: async () => {
    set({ loading: true });
    try {
      const data = await api.get<OnboardingStatus>("/onboarding/status");
      set({
        completed: data.completed,
        currentStep: data.current_step,
        assessmentScore: data.assessment_score,
        cefrLevel: data.cefr_level,
        recommendedPath: data.recommended_path,
      });
    } catch {
      set({ completed: true });
    }
    set({ loading: false });
  },
}));
