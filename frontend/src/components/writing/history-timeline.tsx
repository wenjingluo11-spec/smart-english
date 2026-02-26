"use client";

import { useState } from "react";

interface HistoryItem {
  id: number;
  prompt: string;
  score: number | null;
  feedback_json: {
    summary?: string;
    strengths?: string[];
    improvements?: string[];
  } | null;
  created_at: string;
}

export default function HistoryTimeline({ items }: { items: HistoryItem[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        暂无写作记录
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border p-4 transition-all cursor-pointer"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
          onClick={() => setExpanded(expanded === item.id ? null : item.id)}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                {item.prompt}
              </span>
              <span className="text-xs ml-2" style={{ color: "var(--color-text-secondary)" }}>
                {new Date(item.created_at).toLocaleDateString("zh-CN")}
              </span>
            </div>
            {item.score !== null && (
              <span
                className="text-sm font-bold px-2 py-0.5 rounded"
                style={{
                  color: item.score >= 80 ? "#22c55e" : item.score >= 60 ? "#f97316" : "#ef4444",
                  background: item.score >= 80 ? "#dcfce7" : item.score >= 60 ? "#fff7ed" : "#fee2e2",
                }}
              >
                {item.score}分
              </span>
            )}
          </div>

          {expanded === item.id && item.feedback_json && (
            <div className="mt-3 pt-3 border-t text-sm animate-slide-up" style={{ borderColor: "var(--color-border)" }}>
              {item.feedback_json.summary && (
                <p className="mb-2" style={{ color: "var(--color-text)" }}>{item.feedback_json.summary}</p>
              )}
              {item.feedback_json.strengths && item.feedback_json.strengths.length > 0 && (
                <div className="mb-2">
                  <span className="text-xs font-medium text-green-600">优点：</span>
                  <ul className="list-disc list-inside text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                    {item.feedback_json.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {item.feedback_json.improvements && item.feedback_json.improvements.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-orange-600">改进建议：</span>
                  <ul className="list-disc list-inside text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                    {item.feedback_json.improvements.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
