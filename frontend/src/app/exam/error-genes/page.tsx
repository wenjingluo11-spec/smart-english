"use client";

import { useEffect, useState } from "react";
import { useExamStore } from "@/stores/exam";
import AudioPlayer from "@/components/cognitive/AudioPlayer";
import ExpertDemo from "@/components/cognitive/ExpertDemo";
import CognitiveFeedback from "@/components/cognitive/CognitiveFeedback";
import { useEnhancementConfig } from "@/hooks/use-enhancement-config";
import { tracker } from "@/lib/behavior-tracker";

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "rgba(239,68,68,0.15)", text: "#ef4444", label: "活跃" },
  improving: { bg: "rgba(234,179,8,0.15)", text: "#eab308", label: "改善中" },
  fixed: { bg: "rgba(34,197,94,0.15)", text: "#22c55e", label: "已修复" },
};

export default function ErrorGenesPage() {
  const { config: enhConfig } = useEnhancementConfig();
  const { errorGenes, loading, fetchErrorGenes, analyzeErrorGenes, generateGeneFix, submitGeneFix } = useExamStore();
  const [selectedGene, setSelectedGene] = useState<number | null>(null);
  const [fixIndex, setFixIndex] = useState(0);
  const [fixFeedback, setFixFeedback] = useState<{ correct: boolean; explanation: string; how_to_spot?: string; common_trap?: string } | null>(null);

  useEffect(() => { fetchErrorGenes(); }, [fetchErrorGenes]);

  const gene = errorGenes.find((g) => g.id === selectedGene);
  const exercises = gene?.fix_exercises;

  const handleFixAnswer = async (answer: string) => {
    if (!gene) return;
    const res = await submitGeneFix(gene.id, fixIndex, answer);
    setFixFeedback({ correct: res.is_correct as boolean, explanation: (res.explanation as string) || "", how_to_spot: (res.how_to_spot as string) || "", common_trap: (res.common_trap as string) || "" });
    tracker.track("answer_submit", { module: "exam" }, { event_data: { answer, is_correct: res.is_correct, gene_id: gene.id } });
    setTimeout(() => {
      setFixFeedback(null);
      if (fixIndex + 1 < (exercises?.length || 0)) {
        setFixIndex(fixIndex + 1);
      } else {
        setSelectedGene(null);
        setFixIndex(0);
        fetchErrorGenes();
      }
    }, fixFeedback?.correct ? 1500 : 4000);
  };

  // 修复练习界面
  if (gene && exercises && exercises.length > 0) {
    const ex = exercises[fixIndex];
    return (
      <div className="max-w-lg mx-auto mt-8 p-6 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>🔧 修复练习</h2>
          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{fixIndex + 1}/{exercises.length}</span>
        </div>
        <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: "var(--color-bg)", color: "var(--color-text-secondary)" }}>
          目标：{gene.pattern_description}
        </p>
        <p className="mb-4 leading-relaxed" style={{ color: "var(--color-text)" }}>{ex.question}</p>
        <div className="space-y-2">
          {ex.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            return (
              <button key={i} onClick={() => handleFixAnswer(letter)} disabled={!!fixFeedback}
                className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                {opt}
              </button>
            );
          })}
        </div>
        {fixFeedback && (
          <div className="mt-4 space-y-2">
            <div className="p-3 rounded-xl text-sm"
              style={{ background: fixFeedback.correct ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: fixFeedback.correct ? "#22c55e" : "#ef4444" }}>
              {fixFeedback.correct ? "✓ 正确！" : "✗ 错误"} {fixFeedback.explanation}
            </div>
            {/* 学霸审题演示 — 答错时展示 */}
            {!fixFeedback.correct && gene && enhConfig.show_expert_demo && (
              <ExpertDemo
                questionText={ex.question}
                questionId={gene.id}
                source="exam"
              />
            )}
            {/* 统一认知反馈 */}
            {!fixFeedback.correct && (
              <CognitiveFeedback
                data={{
                  how_to_spot: fixFeedback.how_to_spot,
                  common_trap: fixFeedback.common_trap,
                }}
                compact
              />
            )}
            <AudioPlayer text={ex.question} compact label="朗读题目" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>🧬 错题基因</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>AI 深度分析你的错误模式，精准修复</p>
        </div>
        <button onClick={analyzeErrorGenes} disabled={loading}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: "var(--color-primary)" }}>
          {loading ? "分析中..." : "重新分析"}
        </button>
      </div>

      {errorGenes.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <div className="text-4xl mb-4">🧬</div>
          <p style={{ color: "var(--color-text-secondary)" }}>暂无错题基因数据</p>
          <p className="text-sm mt-2" style={{ color: "var(--color-text-secondary)" }}>多做一些练习后，点击"重新分析"来发现你的错误模式</p>
        </div>
      ) : (
        <div className="space-y-3">
          {errorGenes.map((g) => {
            const statusInfo = STATUS_COLORS[g.status] || STATUS_COLORS.active;
            return (
              <div key={g.id} className="p-4 rounded-2xl transition-all"
                style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: statusInfo.bg, color: statusInfo.text }}>
                        {statusInfo.label}
                      </span>
                      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{g.section}</span>
                    </div>
                    <p className="font-medium" style={{ color: "var(--color-text)" }}>{g.pattern_description}</p>
                  </div>
                </div>

                {g.fix_attempts > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-bg)" }}>
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${(g.fix_correct / Math.max(g.fix_attempts, 1)) * 100}%`,
                        background: g.status === "fixed" ? "#22c55e" : "var(--color-primary)",
                      }} />
                    </div>
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {g.fix_correct}/{g.fix_attempts}
                    </span>
                  </div>
                )}

                {g.status !== "fixed" && (
                  <button onClick={async () => {
                    if (!g.fix_exercises) await generateGeneFix(g.id);
                    setSelectedGene(g.id);
                    setFixIndex(0);
                  }}
                    className="text-sm px-4 py-2 rounded-lg font-medium text-white"
                    style={{ background: "var(--color-primary)" }}>
                    {g.fix_exercises ? "继续修复" : "开始修复"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
