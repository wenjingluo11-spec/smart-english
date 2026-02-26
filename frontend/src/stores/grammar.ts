import { create } from "zustand";
import { api } from "@/lib/api";

interface GrammarTopic {
  id: number;
  category: string;
  name: string;
  difficulty: number;
  cefr_level: string;
  mastery: number;
  total_attempts: number;
}

interface TopicDetail {
  id: number;
  category: string;
  name: string;
  difficulty: number;
  cefr_level: string;
  explanation: string;
  examples: string[];
  tips: string[];
}

interface Exercise {
  id: number;
  content: string;
  options: string[];
  exercise_type: string;
}

interface Category {
  category: string;
  count: number;
}

interface GrammarState {
  categories: Category[];
  topics: GrammarTopic[];
  topicDetail: TopicDetail | null;
  exercises: Exercise[];
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
      const data = await api.get<Category[]>("/grammar/categories");
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
      const data = await api.get<TopicDetail>(`/grammar/topics/${id}`);
      set({ topicDetail: data });
    } catch { /* ignore */ }
  },

  fetchExercises: async (topicId) => {
    try {
      const data = await api.get<Exercise[]>(`/grammar/topics/${topicId}/exercises`);
      set({ exercises: data });
    } catch { /* ignore */ }
  },

  submitExercise: async (exerciseId, answer) => {
    const data = await api.post<Record<string, unknown>>(
      `/grammar/exercises/${exerciseId}/submit?answer=${encodeURIComponent(answer)}`,
      {}
    );
    return data;
  },

  setCategory: (c) => {
    set({ selectedCategory: c });
    get().fetchTopics(c || undefined);
  },
}));
