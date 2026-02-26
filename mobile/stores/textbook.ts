import { create } from "zustand";
import { api } from "../lib/api";
import type { Textbook, TextbookUnit, TextbookUnitDetail } from "../lib/types";

interface TextbookState {
  textbooks: Textbook[];
  units: TextbookUnit[];
  currentTextbook: Textbook | null;
  currentUnitId: number | null;
  unitDetail: TextbookUnitDetail | null;
  loading: boolean;
  fetchTextbooks: (grade?: string) => Promise<void>;
  fetchUnits: (textbookId: number) => Promise<void>;
  fetchUnitDetail: (unitId: number) => Promise<void>;
  fetchMySetting: () => Promise<void>;
  saveSetting: (textbookId: number, unitId?: number) => Promise<void>;
}

export const useTextbookStore = create<TextbookState>((set, get) => ({
  textbooks: [],
  units: [],
  currentTextbook: null,
  currentUnitId: null,
  unitDetail: null,
  loading: false,

  fetchTextbooks: async (grade) => {
    set({ loading: true });
    try {
      const params = grade ? `?grade=${encodeURIComponent(grade)}` : "";
      const data = await api.get<Textbook[]>(`/textbook/versions${params}`);
      set({ textbooks: data });
    } catch { /* ignore */ }
    set({ loading: false });
  },

  fetchUnits: async (textbookId) => {
    try {
      const data = await api.get<TextbookUnit[]>(`/textbook/versions/${textbookId}/units`);
      set({ units: data });
    } catch { /* ignore */ }
  },

  fetchUnitDetail: async (unitId) => {
    try {
      const data = await api.get<TextbookUnitDetail>(`/textbook/units/${unitId}`);
      set({ unitDetail: data });
    } catch { /* ignore */ }
  },

  fetchMySetting: async () => {
    try {
      const data = await api.get<{
        textbook_id: number | null;
        current_unit_id: number | null;
        textbook: Textbook | null;
      }>("/textbook/my-setting");
      set({ currentTextbook: data.textbook, currentUnitId: data.current_unit_id });
      if (data.textbook_id) get().fetchUnits(data.textbook_id);
    } catch { /* ignore */ }
  },

  saveSetting: async (textbookId, unitId) => {
    await api.post("/textbook/my-setting", {
      textbook_id: textbookId,
      current_unit_id: unitId || null,
    });
    get().fetchMySetting();
  },
}));
