"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface ScoreData {
  weeks: {
    week: string;
    practice_accuracy: number | null;
    writing_score: number | null;
  }[];
}

export default function ScoreTrends() {
  const [data, setData] = useState<ScoreData | null>(null);

  useEffect(() => {
    api.get<ScoreData>("/stats/report/scores").then(setData).catch(() => {});
  }, []);

  if (!data || data.weeks.length === 0) return null;

  const maxVal = 100;
  const chartHeight = 120;

  // Filter weeks that have at least one data point
  const weeks = data.weeks.filter((w) => w.practice_accuracy !== null || w.writing_score !== null);
  if (weeks.length === 0) return null;

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
      <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>成绩趋势（12 周）</h3>

      <div className="relative" style={{ height: chartHeight + 24 }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => (
          <div
            key={v}
            className="absolute left-0 right-0 border-t"
            style={{
              top: chartHeight - (v / maxVal) * chartHeight,
              borderColor: "var(--color-border)",
              opacity: 0.5,
            }}
          >
            <span className="text-[10px] absolute -top-2.5 -left-1" style={{ color: "var(--color-text-secondary)" }}>
              {v}
            </span>
          </div>
        ))}

        {/* Data points and lines */}
        <svg className="absolute inset-0" style={{ width: "100%", height: chartHeight }} viewBox={`0 0 ${weeks.length * 40} ${chartHeight}`} preserveAspectRatio="none">
          {/* Practice accuracy line */}
          {weeks.map((w, i) => {
            if (w.practice_accuracy === null || i === 0) return null;
            const prev = weeks[i - 1];
            if (prev.practice_accuracy === null) return null;
            return (
              <line
                key={`p-${i}`}
                x1={i * 40 - 20}
                y1={chartHeight - (prev.practice_accuracy / maxVal) * chartHeight}
                x2={i * 40 + 20}
                y2={chartHeight - (w.practice_accuracy / maxVal) * chartHeight}
                stroke="#3b82f6"
                strokeWidth="2"
              />
            );
          })}
          {/* Writing score line */}
          {weeks.map((w, i) => {
            if (w.writing_score === null || i === 0) return null;
            const prev = weeks[i - 1];
            if (prev.writing_score === null) return null;
            return (
              <line
                key={`w-${i}`}
                x1={i * 40 - 20}
                y1={chartHeight - (prev.writing_score / maxVal) * chartHeight}
                x2={i * 40 + 20}
                y2={chartHeight - (w.writing_score / maxVal) * chartHeight}
                stroke="#f59e0b"
                strokeWidth="2"
              />
            );
          })}
          {/* Dots */}
          {weeks.map((w, i) => (
            <g key={i}>
              {w.practice_accuracy !== null && (
                <circle cx={i * 40 + 20} cy={chartHeight - (w.practice_accuracy / maxVal) * chartHeight} r="3" fill="#3b82f6" />
              )}
              {w.writing_score !== null && (
                <circle cx={i * 40 + 20} cy={chartHeight - (w.writing_score / maxVal) * chartHeight} r="3" fill="#f59e0b" />
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#3b82f6" }} />
          <span style={{ color: "var(--color-text-secondary)" }}>练习正确率</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#f59e0b" }} />
          <span style={{ color: "var(--color-text-secondary)" }}>写作得分</span>
        </div>
      </div>
    </div>
  );
}
