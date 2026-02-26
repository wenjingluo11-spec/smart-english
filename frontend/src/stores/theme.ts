import { create } from "zustand";

type ThemeName = "ocean" | "forest" | "sunset" | "lavender" | "midnight" | "sakura";

interface ThemeStore {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  autoTimeTheme: () => ThemeName;
}

export const THEMES: { name: ThemeName; label: string; color: string }[] = [
  { name: "ocean", label: "海洋", color: "#3b82f6" },
  { name: "forest", label: "森林", color: "#22c55e" },
  { name: "sunset", label: "日落", color: "#f97316" },
  { name: "lavender", label: "薰衣草", color: "#a78bfa" },
  { name: "midnight", label: "午夜", color: "#6366f1" },
  { name: "sakura", label: "樱花", color: "#ec4899" },
];

function getStoredTheme(): ThemeName {
  if (typeof window === "undefined") return "ocean";
  return (localStorage.getItem("theme") as ThemeName) || "ocean";
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: getStoredTheme(),
  setTheme: (t) => {
    localStorage.setItem("theme", t);
    set({ theme: t });
  },
  autoTimeTheme: () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return "sunset";    // morning warm
    if (hour >= 12 && hour < 18) return "ocean";     // afternoon fresh
    return "midnight";                                // evening cool
  },
}));
