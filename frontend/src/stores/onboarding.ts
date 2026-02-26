import { create } from "zustand";
import { api } from "@/lib/api";

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
  completed: true, // default true to avoid redirect flash
  currentStep: null,
  assessmentScore: null,
  cefrLevel: null,
  recommendedPath: null,
  loading: false,

  fetchStatus: async () => {
    set({ loading: true });
    try {
      const data = await api.get<{
        completed: boolean;
        current_step: string | null;
        assessment_score: number | null;
        cefr_level: string | null;
        recommended_path: string | null;
      }>("/onboarding/status");
      set({
        completed: data.completed,
        currentStep: data.current_step,
        assessmentScore: data.assessment_score,
        cefrLevel: data.cefr_level,
        recommendedPath: data.recommended_path,
      });
    } catch {
      // If error, assume completed to avoid blocking
      set({ completed: true });
    }
    set({ loading: false });
  },
}));
