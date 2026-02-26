import { create } from "zustand";
import { getToken, setToken, removeToken } from "../lib/auth";
import type { User } from "../lib/types";

interface UserStore {
  user: User | null;
  token: string | null;
  ready: boolean;
  init: () => Promise<void>;
  setAuth: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  token: null,
  ready: false,
  init: async () => {
    const token = await getToken();
    set({ token, ready: true });
  },
  setAuth: async (user, token) => {
    await setToken(token);
    set({ user, token });
  },
  logout: async () => {
    await removeToken();
    set({ user: null, token: null });
  },
}));
