import { create } from "zustand";
import { api } from "@/lib/api";

interface QuestTemplate {
  id: number; title: string; description: string; difficulty: number;
  category: string; requirements: Record<string, unknown> | null;
  tips: Record<string, unknown> | null; xp_reward: number; user_status?: string;
}

interface UserQuest {
  id: number; template_id: number; title: string; difficulty: number;
  category: string; xp_reward: number; status: string;
  evidence_url: string | null; ai_verification: Record<string, unknown> | null;
  started_at: string; completed_at: string | null;
}

interface CommunityItem {
  quest_title: string; difficulty: number; evidence_url: string | null;
  score: number; completed_at: string;
}

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
  available: [], myQuests: [], community: [], loading: false,

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
    set({ loading: false });
    // Refresh lists
    const [avail, my] = await Promise.all([
      api.get<QuestTemplate[]>("/quest/available"),
      api.get<UserQuest[]>("/quest/my-quests"),
    ]);
    set({ available: avail, myQuests: my });
  },

  submitEvidence: async (questId, evidenceUrl) => {
    const res = await api.post<Record<string, unknown>>(`/quest/submit/${questId}`, { evidence_url: evidenceUrl });
    // Refresh
    const my = await api.get<UserQuest[]>("/quest/my-quests");
    set({ myQuests: my });
    return res;
  },
}));
