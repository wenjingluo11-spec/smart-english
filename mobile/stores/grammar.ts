import { create } from "zustand";
import { api } from "../lib/api";
import type { GrammarTopic, GrammarTopicDetail, GrammarExercise, GrammarCategory } from "../lib/types";

interface GrammarState {
  categories: GrammarCategory[];
  topics: GrammarTopic[];
  topicDetail: GrammarTopicDetail | null;
  exercises: GrammarExercise[];
  selectedCategory: string | null;
  loading: boolean;
  fetchCategories: () => Promise<void>;
  fetchTopics: (category?: string) => Promise<void>;
  fetchTopicDetail: (id: number) => Promise<void>;
  fetchExercises: (topicId: number) => Promise<void>;
  submitExercise: (exerciseId: number, answer: string) => Promise<Record<string, unknown>>;
  setCategory: (c: string | null) => void;
}

export const useGrammarStore = create<GrammarState>((set, get) => ({
  categories: [],
  topics: [],
  topicDetail: null,
  exercises: [],
  selectedCategory: null,
  loading: false,

  fetchCategories: async () => {
    try {
      const data = await api.get<GrammarCategory[]>("/grammar/categories");
      set({ categories: data });
    } catch { /* ignore */ }
  },

  fetchTopics: async (category) => {
    set({ loading: true });
    try {
      const params = category ? `?category=${encodeURIComponent(category)}` : "";
      const data = await api.get<GrammarTopic[]>(`/grammar/topics${params}`);
      set({ topics: data });
    } catch { /* ignore */ }
    set({ loading: false });
  },

  fetchTopicDetail: async (id) => {
    try {
      const data = await api.get<GrammarTopicDetail>(`/grammar/topics/${id}`);
      set({ topicDetail: data });
    } catch { /* ignore */ }
  },

  fetchExercises: async (topicId) => {
    try {
      const data = await api.get<GrammarExercise[]>(`/grammar/topics/${topicId}/exercises`);
      set({ exercises: data });
    } catch { /* ignore */ }
  },

  submitExercise: async (exerciseId, answer) => {
    return api.post<Record<string, unknown>>(
      `/grammar/exercises/${exerciseId}/submit?answer=${encodeURIComponent(answer)}`, {}
    );
  },

  setCategory: (c) => {
    set({ selectedCategory: c });
    get().fetchTopics(c || undefined);
  },
}));
