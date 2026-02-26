"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface GoalsStepProps {
  cefrLevel: string;
  onComplete: (result: { recommended_path: string }) => void;
}

const DAILY_OPTIONS = [
  { value: 15, label: "15 分钟", desc: "轻松入门" },
  { value: 30, label: "30 分钟", desc: "稳步提升" },
  { value: 45, label: "45 分钟", desc: "高效进步" },
  { value: 60, label: "60 分钟", desc: "冲刺模式" },
];

const EXAM_OPTIONS = [
  { value: "none", label: "暂无考试目标", desc: "自由学习" },
  { value: "zhongkao", label: "中考", desc: "初中升学" },
  { value: "gaokao", label: "高考", desc: "高中升学" },
];

export default function GoalsStep({ cefrLevel, onComplete }: GoalsStepProps) {
  const [dailyGoal, setDailyGoal] = useState(30);
  const [targetExam, setTargetExam] = useState("none");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await api.post<{ recommended_path: string }>("/onboarding/goals", {
        daily_goal_minutes: dailyGoal,
        target_exam: targetExam === "none" ? null : targetExam,
      });
      onComplete(result);
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div>
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🎯</div>
        <h3 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>设定学习目标</h3>
        <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
          当前水平：CEFR {cefrLevel}
        </p>
      </div>

      {/* Daily goal */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block" style={{ color: "var(--color-text)" }}>
          每日学习时长
        </label>
        <div className="grid grid-cols-2 gap-2">
          {DAILY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDailyGoal(opt.value)}
              className={`text-left px-3 py-2.5 rounded-lg border transition-all ${dailyGoal === opt.value ? "border-2" : ""}`}
              style={{
                borderColor: dailyGoal === opt.value ? "var(--color-primary)" : "var(--color-border)",
                background: dailyGoal === opt.value ? "var(--color-primary-light, #dbeafe)" : "var(--color-surface)",
              }}
            >
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{opt.label}</div>
              <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Target exam */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block" style={{ color: "var(--color-text)" }}>
          考试目标
        </label>
        <div className="space-y-2">
          {EXAM_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTargetExam(opt.value)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${targetExam === opt.value ? "border-2" : ""}`}
              style={{
                borderColor: targetExam === opt.value ? "var(--color-primary)" : "var(--color-border)",
                background: targetExam === opt.value ? "var(--color-primary-light, #dbeafe)" : "var(--color-surface)",
              }}
            >
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{opt.label}</div>
              <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
        style={{ background: "var(--color-primary)" }}
      >
        {loading ? "生成学习路径..." : "确认目标"}
      </button>
    </div>
  );
}
