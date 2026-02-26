"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface TimeData {
  total_minutes: number;
  by_module: Record<string, number>;
  daily_by_module: { date: string; module: string; seconds: number }[];
}

const MODULE_LABELS: Record<string, string> = {
  practice: "练习",
  reading: "阅读",
  writing: "写作",
  vocabulary: "词汇",
  exam: "考试",
  tutor: "导师",
  story: "故事",
  grammar: "语法",
  arena: "对战",
  textbook: "教材",
};

const MODULE_COLORS: Record<string, string> = {
  practice: "#3b82f6",
  reading: "#10b981",
  writing: "#f59e0b",
  vocabulary: "#8b5cf6",
  exam: "#ef4444",
  tutor: "#06b6d4",
  story: "#ec4899",
  grammar: "#14b8a6",
  arena: "#f97316",
  textbook: "#6366f1",
};

export default function TimeChart() {
  const [data, setData] = useState<TimeData | null>(null);

  useEffect(() => {
    api.get<TimeData>("/stats/report/time?days=30").then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  const modules = Object.entries(data.by_module)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const totalMinutes = data.total_minutes;

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium" style={{ color: "var(--color-text)" }}>学习时长（近 30 天）</h3>
        <span className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>
          {totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : `${totalMinutes}m`}
        </span>
      </div>

      {/* Stacked bar */}
      {modules.length > 0 && (
        <div className="h-4 rounded-full overflow-hidden flex mb-3" style={{ background: "var(--color-border)" }}>
          {modules.map(([mod, secs]) => (
            <div
              key={mod}
              className="h-full transition-all"
              style={{
                width: `${(secs / Object.values(data.by_module).reduce((a, b) => a + b, 0)) * 100}%`,
                background: MODULE_COLORS[mod] || "#94a3b8",
              }}
              title={`${MODULE_LABELS[mod] || mod}: ${Math.round(secs / 60)}分钟`}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {modules.map(([mod, secs]) => (
          <div key={mod} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: MODULE_COLORS[mod] || "#94a3b8" }} />
            <span style={{ color: "var(--color-text-secondary)" }}>
              {MODULE_LABELS[mod] || mod} {Math.round(secs / 60)}m
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
