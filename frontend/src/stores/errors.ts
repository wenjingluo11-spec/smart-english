import { create } from "zustand";
import { api } from "@/lib/api";

interface ErrorEntry {
  id: number;
  source_type: string;
  question_snapshot: string;
  question_type: string;
  topic: string;
  difficulty: number;
  user_answer: string;
  correct_answer: string;
  explanation: string;
  status: string;
  retry_count: number;
  created_at: string;
}

interface ErrorStats {
  total: number;
  unmastered: number;
  mastered: number;
  by_topic: { topic: string; count: number }[];
  by_type: { type: string; count: number }[];
  recent_trend: { date: string; count: number }[];
}

interface ErrorsState {
  entries: ErrorEntry[];
  total: number;
  page: number;
  pageSize: number;
  filter: { status?: string; topic?: string; question_type?: string; difficulty?: number };
  stats: ErrorStats | null;
  loading: boolean;
  fetchErrors: () => Promise<void>;
  fetchStats: () => Promise<void>;
  setFilter: (f: Partial<ErrorsState["filter"]>) => void;
  setPage: (p: number) => void;
  retryError: (id: number, answer: string) => Promise<Record<string, unknown>>;
  markMastered: (id: number) => Promise<void>;
  deleteError: (id: number) => Promise<void>;
}

export const useErrorsStore = create<ErrorsState>((set, get) => ({
  entries: [],
  total: 0,
  page: 1,
  pageSize: 20,
  filter: {},
  stats: null,
  loading: false,

  fetchErrors: async () => {
    set({ loading: true });
    try {
      const { page, pageSize, filter } = get();
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("page_size", String(pageSize));
      if (filter.status) params.set("status", filter.status);
      if (filter.topic) params.set("topic", filter.topic);
      if (filter.question_type) params.set("question_type", filter.question_type);
      if (filter.difficulty) params.set("difficulty", String(filter.difficulty));
      const data = await api.get<{ total: number; items: ErrorEntry[] }>(`/errors/?${params}`);
      set({ entries: data.items, total: data.total });
    } catch { /* ignore */ }
    set({ loading: false });
  },

  fetchStats: async () => {
    try {
      const data = await api.get<ErrorStats>("/errors/stats");
      set({ stats: data });
    } catch { /* ignore */ }
  },

  setFilter: (f) => {
    set((s) => ({ filter: { ...s.filter, ...f }, page: 1 }));
    get().fetchErrors();
  },

  setPage: (p) => {
    set({ page: p });
    get().fetchErrors();
  },

  retryError: async (id, answer) => {
    const data = await api.post<Record<string, unknown>>(`/errors/${id}/retry`, { answer });
    get().fetchErrors();
    get().fetchStats();
    return data;
  },

  markMastered: async (id) => {
    await api.post(`/errors/${id}/master`, {});
    get().fetchErrors();
    get().fetchStats();
  },

  deleteError: async (id) => {
    await api.del(`/errors/${id}`);
    get().fetchErrors();
    get().fetchStats();
  },
}));
