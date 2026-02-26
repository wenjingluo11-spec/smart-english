"use client";

import { useEffect } from "react";
import { useExamStore } from "@/stores/exam";
import { useRouter } from "next/navigation";

const SECTION_LABELS: Record<string, string> = {
  reading: "阅读", cloze: "完形", grammar_fill: "语法", error_correction: "改错", writing: "写作", listening: "听力",
};

export default function ReplayPage() {
  const router = useRouter();
  const { replayData, loading, fetchReplayData } = useExamStore();

  useEffect(() => { fetchReplayData(); }, [fetchReplayData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 rounded-full" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!replayData || replayData.total_mocks === 0) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h1 className="text-xl font-bold mb-2" style={{ color: "var(--color-text)" }}>暂无回放数据</h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>完成几次模考后，这里会生成你的成长纪录片</p>
        <button onClick={() => router.push("/exam/mock")}
          className="px-6 py-3 rounded-xl font-medium text-white" style={{ background: "var(--color-primary)" }}>
          去模考
        </button>
      </div>
    );
  }

  const { chapters, current_masteries, milestones, narrative, projection, mock_scores, target_score } = replayData;

  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>📊 成长回放</h1>

      {/* 旁白 */}
      {narrative && (
        <div className="p-5 rounded-2xl" style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent, var(--color-primary)))", color: "white" }}>
          <p className="text-sm leading-relaxed italic">{narrative}</p>
        </div>
      )}

      {/* 分数曲线 */}
      {mock_scores.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <h3 className="text-sm font-medium mb-4" style={{ color: "var(--color-text)" }}>模考分数轨迹</h3>
          <div className="flex items-end gap-2 h-32">
            {mock_scores.map((ms, i) => {
              const pct = (ms.total / ms.max) * 100;
              const targetPct = (target_score / ms.max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>{ms.total}</span>
                  <div className="w-full rounded-t-lg transition-all relative" style={{
                    height: `${pct}%`, background: "var(--color-primary)", minHeight: "8px", opacity: 0.7 + (i / mock_scores.length) * 0.3,
                  }} />
                  <span className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>{ms.date.slice(5, 10)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-px flex-1" style={{ background: "#f59e0b" }} />
            <span className="text-xs" style={{ color: "#f59e0b" }}>目标 {target_score}</span>
          </div>
        </div>
      )}

      {/* 当前掌握度 */}
      <div className="p-5 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
        <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>当前各题型掌握度</h3>
        <div className="space-y-2">
          {Object.entries(current_masteries).map(([sec, val]) => (
            <div key={sec} className="flex items-center gap-3">
              <span className="text-xs w-12" style={{ color: "var(--color-text-secondary)" }}>{SECTION_LABELS[sec] || sec}</span>
              <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "var(--color-bg)" }}>
                <div className="h-full rounded-full transition-all" style={{
                  width: `${val * 100}%`,
                  background: val >= 0.7 ? "#22c55e" : val >= 0.4 ? "var(--color-primary)" : "#ef4444",
                }} />
              </div>
              <span className="text-xs font-medium w-10 text-right" style={{ color: "var(--color-text)" }}>{Math.round(val * 100)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* 里程碑 */}
      {milestones.length > 0 && (
        <div className="p-5 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>里程碑事件</h3>
          <div className="space-y-3">
            {milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ background: "var(--color-primary)" }} />
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{m.date}</span>
                <span className="text-sm" style={{ color: "var(--color-text)" }}>{m.event}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 未来投影 */}
      {projection && (
        <div className="p-5 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>分数预测</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-black" style={{ color: "var(--color-primary)" }}>{projection.predicted_score}</div>
              <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>预测分数（置信度 {Math.round(projection.confidence * 100)}%）</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold" style={{ color: projection.gap <= 0 ? "#22c55e" : "#f59e0b" }}>
                {projection.gap <= 0 ? "已达标 ✓" : `差 ${projection.gap} 分`}
              </div>
              <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>目标 {projection.target_score}</div>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => router.push("/exam")}
        className="w-full py-3 rounded-xl font-medium" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>
        返回冲刺中心
      </button>
    </div>
  );
}
