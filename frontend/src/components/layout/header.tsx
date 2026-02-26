"use client";

import { useEffect } from "react";
import { useUserStore } from "@/stores/user";
import { useXpStore } from "@/stores/xp";
import { useThemeStore, THEMES } from "@/stores/theme";
import { useRouter } from "next/navigation";
import LevelBadge from "@/components/ui/level-badge";
import NotificationBell from "@/components/layout/notification-bell";

interface HeaderProps {
  collapsed: boolean;
}

export default function Header({ collapsed }: HeaderProps) {
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);
  const router = useRouter();
  const { totalXp, level, xpForNext, loaded, fetchXp } = useXpStore();
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    if (!loaded) fetchXp();
  }, [loaded, fetchXp]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header
      className={`h-14 border-b flex items-center justify-between px-6 fixed top-0 ${collapsed ? "left-16" : "left-56"} right-0 z-10 transition-all duration-200`}
      style={{
        borderColor: "color-mix(in srgb, var(--color-border) 50%, transparent)",
        background: "color-mix(in srgb, var(--color-surface) 75%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {/* Theme selector */}
      <div className="flex items-center gap-2">
        {THEMES.map((t) => (
          <button
            key={t.name}
            onClick={() => setTheme(t.name)}
            className={`w-6 h-6 rounded-full transition-all duration-200 ${theme === t.name ? "scale-125 ring-2 ring-offset-2 shadow-md" : "opacity-50 hover:opacity-100 hover:scale-110"}`}
            style={{
              background: t.color,
              ["--tw-ring-color" as string]: t.color,
              ["--tw-ring-offset-color" as string]: "var(--color-surface)",
            }}
            title={t.label}
          />
        ))}
      </div>

      <div className="flex items-center gap-4">
        {/* Level badge */}
        <LevelBadge level={level} xp={totalXp} xpForNext={xpForNext} />

        {/* Notifications */}
        <NotificationBell />

        <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {user ? `${user.grade_level} · ${user.grade}` : ""}
        </span>
        {user && (
          <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))", color: "white" }}>
            {user.cefr_level}
          </span>
        )}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
          style={{
            background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
            color: "white",
            boxShadow: "0 2px 8px rgba(var(--color-primary-rgb), 0.3)",
          }}
        >
          {user?.phone?.slice(-2) || "U"}
        </div>
        <button
          onClick={handleLogout}
          className="text-xs hover:opacity-80"
          style={{ color: "var(--color-text-secondary)" }}
        >
          退出
        </button>
      </div>
    </header>
  );
}
