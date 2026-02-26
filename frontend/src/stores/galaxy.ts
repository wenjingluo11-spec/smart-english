import { create } from "zustand";
import { api } from "@/lib/api";

interface GalaxyNode {
  id: number; word: string; pos: string; definition: string; definition_en?: string;
  cefr_level: string; frequency_rank?: number; example_sentence?: string; status: string;
}

interface GalaxyEdge {
  source_id: number; target_id: number; source_word: string; target_word: string;
  relation_type: string; weight: number;
}

interface GalaxyStats {
  total_nodes: number; undiscovered: number; seen: number; familiar: number; mastered: number; progress_pct: number;
}

interface GalaxyState {
  nodes: GalaxyNode[];
  edges: GalaxyEdge[];
  stats: GalaxyStats | null;
  selectedNode: GalaxyNode | null;
  relatedNodes: GalaxyNode[];
  relatedEdges: GalaxyEdge[];
  loading: boolean;
  fetchView: (limit?: number, offset?: number) => Promise<void>;
  fetchStats: () => Promise<void>;
  selectNode: (nodeId: number) => Promise<void>;
  exploreNode: (nodeId: number) => Promise<void>;
  learnNode: (nodeId: number, status: string) => Promise<void>;
}

export const useGalaxyStore = create<GalaxyState>((set, get) => ({
  nodes: [], edges: [], stats: null, selectedNode: null, relatedNodes: [], relatedEdges: [], loading: false,

  fetchView: async (limit = 50, offset = 0) => {
    set({ loading: true });
    const data = await api.get<{ nodes: GalaxyNode[]; edges: GalaxyEdge[] }>(`/galaxy/view?limit=${limit}&offset=${offset}`);
    set({ nodes: data.nodes, edges: data.edges, loading: false });
  },

  fetchStats: async () => {
    const data = await api.get<GalaxyStats>("/galaxy/stats");
    set({ stats: data });
  },

  selectNode: async (nodeId) => {
    const data = await api.get<{ node: GalaxyNode; related: GalaxyNode[]; edges: GalaxyEdge[] }>(`/galaxy/node/${nodeId}`);
    set({ selectedNode: data.node, relatedNodes: data.related, relatedEdges: data.edges });
  },

  exploreNode: async (nodeId) => {
    set({ loading: true });
    const data = await api.post<{ new_nodes: GalaxyNode[]; new_edges: GalaxyEdge[] }>(`/galaxy/explore/${nodeId}`, {});
    set((s) => ({
      nodes: [...s.nodes, ...data.new_nodes],
      edges: [...s.edges, ...data.new_edges],
      loading: false,
    }));
  },

  learnNode: async (nodeId, status) => {
    await api.post(`/galaxy/learn/${nodeId}?status=${status}`, {});
    set((s) => ({
      nodes: s.nodes.map((n) => n.id === nodeId ? { ...n, status } : n),
      selectedNode: s.selectedNode?.id === nodeId ? { ...s.selectedNode, status } : s.selectedNode,
    }));
  },
}));
