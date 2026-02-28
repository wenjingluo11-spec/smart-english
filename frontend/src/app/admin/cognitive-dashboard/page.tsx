"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface CognitiveStats {
  accuracy_lift: { with_enhancement: number; without_enhancement: number; lift_pct: number };
  by_question_type: { type: string; usage_count: number; avg_rating: number; accuracy_with: number; accuracy_without: number }[];
  feature_usage: { tts: number; demo: number; highlight: number; hint: number };
  total_users: number;
  total_enhancements: number;
  avg_feedback_rating: number;
}

const FEATURE_LABELS: Record<string, string> = { tts: "TTS语音", demo: "学霸演示", highlight: "高亮标注", hint: "提示请求" };
const BAR_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444"];

export default function CognitiveDashboardPage() {
  const [data, setData] = useState<CognitiveStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<CognitiveStats>("/dashboard/cognitive-stats")
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="py-16 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>加载中...</div>;
  if (!data) return <div className="py-16 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>暂无数据</div>;

  const features = Object.entries(data.feature_usage) as [keyof typeof FEATURE_LABELS, number][];

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <h2 className="text-xl font-semibold mb-5" style={{ color: "var(--color-text)" }}>认知增强数据看板</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border p-4 text-center" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
          <div className="text-2xl font-bold" style={{ color: "#10b981" }}>+{data.accuracy_lift.lift_pct}%</div>
          <div className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>正确率提升</div>
        </div>
        <div className="rounded-xl border p-4 text-center" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
          <div className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>{data.total_users}</div>
          <div className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>活跃用户</div>
        </div>
        <div className="rounded-xl border p-4 text-center" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
          <div className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>{data.total_enhancements}</div>
          <div className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>增强使用次数</div>
        </div>
      </div>

      {/* Feature usage bars */}
      <div className="rounded-xl border p-4 mb-6" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>功能使用率</h3>
        <div className="space-y-3">
          {features.map(([key, val], i) => (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>
                <span>{FEATURE_LABELS[key]}</span>
                <span>{Math.round(val * 100)}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(val * 100)}%`, background: BAR_COLORS[i] }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per-type effectiveness table */}
      <div className="rounded-xl border p-4 mb-6 overflow-x-auto" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>各题型增强效果</h3>
        <table className="w-full text-xs" style={{ color: "var(--color-text)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              {["题型", "使用次数", "平均评分", "增强后正确率", "未增强正确率"].map((h) => (
                <th key={h} className="text-left py-2 px-2 font-medium" style={{ color: "var(--color-text-secondary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.by_question_type.map((row) => (
              <tr key={row.type} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <td className="py-2 px-2">{row.type}</td>
                <td className="py-2 px-2">{row.usage_count}</td>
                <td className="py-2 px-2">{row.avg_rating}</td>
                <td className="py-2 px-2" style={{ color: "#10b981" }}>{(row.accuracy_with * 100).toFixed(0)}%</td>
                <td className="py-2 px-2">{(row.accuracy_without * 100).toFixed(0)}%</td>
              </tr>
            ))}
            {data.by_question_type.length === 0 && (
              <tr><td colSpan={5} className="py-4 text-center" style={{ color: "var(--color-text-secondary)" }}>暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Average feedback */}
      <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--color-text)" }}>平均反馈评分</span>
          <span className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>{data.avg_feedback_rating}</span>
        </div>
        <div className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>1=有帮助 2=一般 3=无帮助</div>
      </div>
    </div>
  );
}
