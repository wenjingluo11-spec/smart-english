import { create } from "zustand";
import { api } from "../lib/api";
import type { StoryTemplate, StorySession, StoryChapter } from "../lib/types";

interface StoryState {
  templates: StoryTemplate[];
  sessions: StorySession[];
  currentSession: StorySession | null;
  currentChapter: StoryChapter | null;
  allChapters: StoryChapter[];
  loading: boolean;
  fetchTemplates: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  startStory: (templateId: number) => Promise<void>;
  loadSession: (sessionId: number) => Promise<void>;
  makeChoice: (choice: string) => Promise<void>;
  submitChallenge: (chapterId: number, answer: string) => Promise<Record<string, unknown>>;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  templates: [],
  sessions: [],
  currentSession: null,
  currentChapter: null,
  allChapters: [],
  loading: false,

  fetchTemplates: async () => {
    const data = await api.get<StoryTemplate[]>("/story/templates");
    set({ templates: data });
  },

  fetchSessions: async () => {
    const data = await api.get<StorySession[]>("/story/sessions");
    set({ sessions: data });
  },

  startStory: async (templateId) => {
    set({ loading: true });
    const data = await api.post<{ session: StorySession; chapter: StoryChapter }>("/story/start", { template_id: templateId });
    set({ currentSession: data.session, currentChapter: data.chapter, allChapters: [data.chapter], loading: false });
  },

  loadSession: async (sessionId) => {
    const data = await api.get<{ session: StorySession; chapters: StoryChapter[] }>(`/story/session/${sessionId}`);
    const chapters = data.chapters;
    set({ currentSession: data.session, allChapters: chapters, currentChapter: chapters[chapters.length - 1] || null });
  },

  makeChoice: async (choice) => {
    const session = get().currentSession;
    if (!session) return;
    set({ loading: true });
    const data = await api.post<{ session: StorySession; chapter: StoryChapter }>("/story/choice", { session_id: session.id, choice });
    set((s) => ({
      currentSession: data.session, currentChapter: data.chapter,
      allChapters: [...s.allChapters, data.chapter], loading: false,
    }));
  },

  submitChallenge: async (chapterId, answer) => {
    const session = get().currentSession;
    if (!session) return {};
    return api.post<Record<string, unknown>>("/story/challenge", { session_id: session.id, chapter_id: chapterId, answer });
  },
}));
