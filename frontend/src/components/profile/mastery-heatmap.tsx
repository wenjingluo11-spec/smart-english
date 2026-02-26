"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface MasteryData {
  topics: { topic: string; total: number; correct: number; rate: number }[];
}

export default function MasteryHeatmap() {
  const [data, setData] = useState<MasteryData | null>(null);

  useEffect(() => {
    api.get<MasteryData>("/stats/report/mastery-heatmap").then(setData).catch(() => {});
  }, []);

  if (!data || data.topics.length === 0) return null;

  const getColor = (rate: number) => {
    if (rate >= 80) return "#22c55e";
    if (rate >= 60) return "#84cc16";
    if (rate >= 40) return "#eab308";
    if (rate >= 20) return "#f97316";
    return "#ef4444";
  };

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
      <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>知识点掌握度</h3>

      <div className="flex flex-wrap gap-2">
        {data.topics.map((t) => (
          <div
            key={t.topic}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-transform hover:scale-105 cursor-default"
            style={{ background: getColor(t.rate) }}
            title={`${t.topic}: ${t.rate}% (${t.correct}/${t.total})`}
          >
            {t.topic} {t.rate}%
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
        <span>掌握度：</span>
        {[
          { label: "优秀", color: "#22c55e" },
          { label: "良好", color: "#84cc16" },
          { label: "一般", color: "#eab308" },
          { label: "薄弱", color: "#f97316" },
          { label: "待加强", color: "#ef4444" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ background: l.color }} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
