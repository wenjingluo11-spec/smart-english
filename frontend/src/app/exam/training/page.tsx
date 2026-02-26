"use client";

import { useEffect } from "react";
import { useExamStore } from "@/stores/exam";
import Link from "next/link";
import MasteryBar from "@/components/exam/mastery-bar";

const SECTION_ICONS: Record<string, string> = {
  listening: "🎧", reading: "📖", cloze: "📝", grammar_fill: "✏️", error_correction: "🔍", writing: "✍️",
};

export default function TrainingPage() {
  const { profile, sectionMasteries, loading, fetchDashboard } = useExamStore();

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 rounded-full" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <p style={{ color: "var(--color-text-secondary)" }}>请先完成考试冲刺设置</p>
        <Link href="/exam" className="mt-3 inline-block px-4 py-2 rounded-lg text-white" style={{ background: "var(--color-primary)" }}>前往设置</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>📚 专项训练</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          选择题型开始自适应训练，系统会根据你的掌握度智能出题
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {sectionMasteries.map((s) => (
          <Link key={s.section} href={`/exam/training/${s.section}`}
            className="p-5 rounded-2xl transition-all hover:scale-[1.02]"
            style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{SECTION_ICONS[s.section] || "📋"}</span>
              <div>
                <h3 className="font-medium" style={{ color: "var(--color-text)" }}>{s.label}</h3>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {s.practiced_points}/{s.total_points} 知识点已练习
                </p>
              </div>
            </div>
            <MasteryBar mastery={s.mastery} />
            <p className="text-xs mt-2 text-right" style={{ color: "var(--color-text-secondary)" }}>
              掌握度 {Math.round(s.mastery * 100)}%
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
