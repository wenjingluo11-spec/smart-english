"use client";

import { useEffect } from "react";
import { useClinicStore } from "@/stores/clinic";
import PatternCard from "@/components/clinic/pattern-card";
import TreatmentSession from "@/components/clinic/treatment-session";

export default function ClinicPage() {
  const { patterns, currentPlan, diagnosing, summary, diagnose, fetchPatterns } = useClinicStore();

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  if (currentPlan) {
    return (
      <div className="max-w-3xl mx-auto">
        <TreatmentSession />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>🔬 AI 错题诊所</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            AI 分析你的错误模式，生成针对性治疗方案
          </p>
        </div>
        <button
          onClick={diagnose}
          disabled={diagnosing}
          className="px-5 py-2.5 rounded-lg text-white font-medium"
          style={{ background: "var(--color-primary)", opacity: diagnosing ? 0.6 : 1 }}
        >
          {diagnosing ? "诊断中..." : "开始诊断"}
        </button>
      </div>

      {summary && (
        <div className="p-4 rounded-xl" style={{ background: "var(--color-primary-light)", border: "1px solid var(--color-primary)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>📋 诊断摘要</p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text)" }}>{summary}</p>
        </div>
      )}

      {patterns.length === 0 && !diagnosing && (
        <div className="text-center py-12" style={{ color: "var(--color-text-secondary)" }}>
          <div className="text-5xl mb-4">🩺</div>
          <p>点击"开始诊断"，AI 将分析你的学习记录</p>
          <p className="text-sm mt-1">需要有一定的练习和写作记录才能进行诊断</p>
        </div>
      )}

      <div className="space-y-4">
        {patterns.map((p) => (
          <PatternCard key={p.id} pattern={p} />
        ))}
      </div>
    </div>
  );
}
