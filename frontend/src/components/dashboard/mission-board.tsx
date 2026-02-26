"use client";

import { useEffect } from "react";
import { useMissionsStore } from "@/stores/missions";

const TYPE_COLORS: Record<string, string> = {
  practice: "#3b82f6",
  review: "#f97316",
  writing: "#a78bfa",
  reading: "#22c55e",
};

const ICONS: Record<string, string> = {
  practice: "📝",
  review: "🔄",
  writing: "✍️",
  reading: "📖",
};

export default function MissionBoard() {
  const { missions, loaded, fetchMissions } = useMissionsStore();

  useEffect(() => {
    if (!loaded) fetchMissions();
  }, [loaded, fetchMissions]);

  if (!loaded || missions.length === 0) return null;

  const allDone = missions.every((m) => m.completed);

  return (
    <div className="glass-card p-5 animate-slide-up shadow-theme-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-title" style={{ color: "var(--color-text)" }}>
          今日任务
        </h3>
        {allDone && (
          <span className="pill-gradient text-xs">全部完成！</span>
        )}
      </div>
      <div className="space-y-3">
        {missions.map((m) => {
          const color = TYPE_COLORS[m.mission_type] || "var(--color-primary)";
          const progress = Math.min((m.progress / m.target) * 100, 100);
          return (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-xl p-3 transition-all duration-200"
              style={{
                background: m.completed
                  ? "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(132,204,22,0.04))"
                  : "var(--color-surface-hover)",
                borderLeft: `3px solid ${color}`,
              }}
            >
              <span className="text-lg">{ICONS[m.mission_type] || "📌"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${m.completed ? "line-through opacity-50" : ""}`} style={{ color: "var(--color-text)" }}>
                    {m.title}
                  </span>
                  <span className="text-xs ml-2 shrink-0 font-medium" style={{ color }}>
                    +{m.xp_reward} XP
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: m.completed
                        ? "linear-gradient(90deg, #22c55e, #84cc16)"
                        : `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 60%, var(--color-accent)))`,
                    }}
                  />
                </div>
              </div>
              {m.completed && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #22c55e, #84cc16)" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 6l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
