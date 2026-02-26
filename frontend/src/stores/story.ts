import { create } from "zustand";
import { api } from "@/lib/api";

interface StoryTemplate {
  id: number; title: string; genre: string; cefr_min: string; cefr_max: string;
  synopsis: string; cover_emoji: string;
}

interface StorySession {
  id: number; template_id: number; template_title: string; cover_emoji?: string;
  current_chapter: number; total_chapters: number; status: string; started_at: string;
}

interface StoryChapter {
  id: number; chapter_number: number; narrative_text: string;
  choices: { label: string; description: string; next_prompt: string }[] | null;
  challenge: { type: string; question: string; options?: string[]; answer: string; hint?: string; explanation?: string } | null;
  chosen_option: string | null; learning_points: { word: string; meaning: string; usage: string }[] | null;
}

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
  templates: [], sessions: [], currentSession: null, currentChapter: null, allChapters: [], loading: false,

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
