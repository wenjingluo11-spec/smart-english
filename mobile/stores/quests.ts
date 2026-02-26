import { create } from "zustand";
import { api } from "../lib/api";
import type { QuestTemplate, UserQuest, CommunityItem } from "../lib/types";

interface QuestsState {
  available: QuestTemplate[];
  myQuests: UserQuest[];
  community: CommunityItem[];
  loading: boolean;
  fetchAvailable: () => Promise<void>;
  fetchMyQuests: () => Promise<void>;
  fetchCommunity: () => Promise<void>;
  startQuest: (templateId: number) => Promise<void>;
  submitEvidence: (questId: number, evidenceUrl: string) => Promise<Record<string, unknown>>;
}

export const useQuestsStore = create<QuestsState>((set) => ({
  available: [],
  myQuests: [],
  community: [],
  loading: false,

  fetchAvailable: async () => {
    const data = await api.get<QuestTemplate[]>("/quest/available");
    set({ available: data });
  },

  fetchMyQuests: async () => {
    const data = await api.get<UserQuest[]>("/quest/my-quests");
    set({ myQuests: data });
  },

  fetchCommunity: async () => {
    const data = await api.get<CommunityItem[]>("/quest/community");
    set({ community: data });
  },

  startQuest: async (templateId) => {
    set({ loading: true });
    await api.post(`/quest/start/${templateId}`, {});
    const [avail, my] = await Promise.all([
      api.get<QuestTemplate[]>("/quest/available"),
      api.get<UserQuest[]>("/quest/my-quests"),
    ]);
    set({ available: avail, myQuests: my, loading: false });
  },

  submitEvidence: async (questId, evidenceUrl) => {
    const res = await api.post<Record<string, unknown>>(`/quest/submit/${questId}`, { evidence_url: evidenceUrl });
    const my = await api.get<UserQuest[]>("/quest/my-quests");
    set({ myQuests: my });
    return res;
  },
}));
