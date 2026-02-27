"use client";

import { useEffect, useState } from "react";
import { useExamStore } from "@/stores/exam";
import Link from "next/link";
import MasteryBar from "@/components/exam/mastery-bar";
import AudioPlayer from "@/components/cognitive/AudioPlayer";
import ExpertDemo from "@/components/cognitive/ExpertDemo";
import CognitiveFeedback from "@/components/cognitive/CognitiveFeedback";
import { useEnhancementConfig } from "@/hooks/use-enhancement-config";
import { tracker } from "@/lib/behavior-tracker";

const FREQ_LABELS: Record<string, string> = { high: "高频", medium: "中频", low: "低频" };
const FREQ_COLORS: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#6b7280" };

export default function WeaknessPage() {
  const { config: enhConfig } = useEnhancementConfig();
  const {
    profile, weaknesses, currentBreakthrough, loading,
    fetchWeaknesses, startBreakthrough, submitBreakthroughExercise,
  } = useExamStore();

  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [feedback, setFeedback] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (profile) fetchWeaknesses();
  }, [profile, fetchWeaknesses]);

  const handleStartBreakthrough = async (kpId: number) => {
    await startBreakthrough(kpId);
    setExerciseIndex(0);
    setFeedback(null);
    setSelectedAnswer("");
  };

  const handleSubmitExercise = async () => {
    if (!currentBreakthrough || !selectedAnswer) return;
    const result = await submitBreakthroughExercise(currentBreakthrough.id, exerciseIndex, selectedAnswer);
    setFeedback(result);
    tracker.track("answer_submit", { module: "exam" }, { event_data: { answer: selectedAnswer, is_correct: result?.is_correct } });
  };

  const handleNextExercise = () => {
    setFeedback(null);
    setSelectedAnswer("");
    setExerciseIndex(i => i + 1);
  };

  if (!profile) {
    return (
      <div className="text-center py-16">
        <p style={{ color: "var(--color-text-secondary)" }}>请先完成考试冲刺设置</p>
        <Link href="/exam" className="mt-3 inline-block px-4 py-2 rounded-lg text-white" style={{ background: "var(--color-primary)" }}>前往设置</Link>
      </div>
    );
  }

  // Breakthrough flow
  if (currentBreakthrough) {
    const bt = currentBreakthrough;
    const microLesson = bt.micro_lesson_json as { title?: string; explanation?: string; examples?: string[]; common_mistakes?: string[] } | null;
    const exercises = bt.exercises_json || [];
    const currentExercise = exercises[exerciseIndex];

    // Phase 1: Micro lesson
    if (bt.phase === 1 && microLesson) {
      return (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>📖 微课学习</h1>
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
              阶段 1/3
            </span>
          </div>

          <div className="p-5 rounded-2xl space-y-4" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
            <h2 className="text-lg font-medium" style={{ color: "var(--color-text)" }}>{microLesson.title || bt.name}</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
              {microLesson.explanation}
            </p>

            {microLesson.examples && microLesson.examples.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2" style={{ color: "var(--color-text)" }}>典型例句</h3>
                <div className="space-y-2">
                  {microLesson.examples.map((ex, i) => (
                    <div key={i} className="px-3 py-2 rounded-lg text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
                      {ex}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {microLesson.common_mistakes && microLesson.common_mistakes.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2" style={{ color: "#ef4444" }}>⚠️ 常见易错点</h3>
                <ul className="space-y-1">
                  {microLesson.common_mistakes.map((m, i) => (
                    <li key={i} className="text-sm" style={{ color: "var(--color-text-secondary)" }}>• {m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button onClick={() => {
            // Move to phase 2 exercises
            setExerciseIndex(0);
            // Trigger re-render by fetching updated breakthrough
            startBreakthrough(bt.knowledge_point_id);
          }}
            className="w-full py-3 rounded-xl text-white font-medium"
            style={{ background: "var(--color-primary)" }}>
            我学会了，开始练习
          </button>
        </div>
      );
    }

    // Phase 2 & 3: Exercises
    if (currentExercise) {
      return (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
              {bt.phase === 2 ? "✏️ 专项练习" : "🎯 实战检验"}
            </h1>
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
              阶段 {bt.phase}/3 · 第 {exerciseIndex + 1} 题
            </span>
          </div>

          <div className="p-5 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
            <p className="text-base leading-relaxed whitespace-pre-wrap mb-4" style={{ color: "var(--color-text)" }}>
              {currentExercise.question}
            </p>

            {currentExercise.options && currentExercise.options.length > 0 ? (
              <div className="space-y-2">
                {currentExercise.options.map((opt, i) => (
                  <button key={i} onClick={() => !feedback && setSelectedAnswer(opt.charAt(0))}
                    disabled={!!feedback}
                    className="w-full text-left px-4 py-3 rounded-xl transition-all text-sm"
                    style={{
                      background: selectedAnswer === opt.charAt(0) ? "var(--color-primary-light)" : "var(--color-bg)",
                      border: `2px solid ${selectedAnswer === opt.charAt(0) ? "var(--color-primary)" : "var(--color-border)"}`,
                      color: "var(--color-text)",
                    }}>
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <textarea value={selectedAnswer} onChange={e => setSelectedAnswer(e.target.value)}
                disabled={!!feedback} placeholder="请输入答案..."
                className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", minHeight: 80 }} />
            )}
          </div>

          {feedback && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl"
                style={{ background: (feedback.is_correct as boolean) ? "#f0fdf4" : "#fef2f2", border: `1px solid ${(feedback.is_correct as boolean) ? "#22c55e" : "#ef4444"}` }}>
                <p className="text-sm font-medium" style={{ color: (feedback.is_correct as boolean) ? "#22c55e" : "#ef4444" }}>
                  {(feedback.is_correct as boolean) ? "✅ 正确！" : "❌ 错误"}
                </p>
                {!!feedback.explanation && (
                  <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>{String(feedback.explanation)}</p>
                )}
              </div>

              {/* 学霸审题演示 — 答错时展示 */}
              {!(feedback.is_correct as boolean) && currentExercise && enhConfig.show_expert_demo && (
                <ExpertDemo
                  questionText={currentExercise.question}
                  questionId={bt.knowledge_point_id}
                  source="exam"
                />
              )}

              {/* 统一认知反馈 */}
              <CognitiveFeedback
                data={{
                  how_to_spot: feedback.how_to_spot as string | undefined,
                  key_clues: feedback.key_clues as { text: string; role: string }[] | undefined,
                  common_trap: feedback.common_trap as string | undefined,
                  method: feedback.method as string | undefined,
                }}
              />

              {/* 题目朗读 */}
              <AudioPlayer text={currentExercise.question} compact label="朗读题目" />
            </div>
          )}

          {!feedback ? (
            <button onClick={handleSubmitExercise} disabled={!selectedAnswer}
              className="w-full py-3 rounded-xl text-white font-medium"
              style={{ background: "var(--color-primary)", opacity: selectedAnswer ? 1 : 0.5 }}>
              提交答案
            </button>
          ) : exerciseIndex + 1 < exercises.length ? (
            <button onClick={handleNextExercise}
              className="w-full py-3 rounded-xl text-white font-medium"
              style={{ background: "var(--color-primary)" }}>
              下一题
            </button>
          ) : (
            <div className="text-center space-y-3">
              <div className="text-3xl">🎉</div>
              <p className="font-medium" style={{ color: "var(--color-text)" }}>
                {bt.status === "completed" ? "突破完成！" : "本阶段完成！"}
              </p>
              {bt.mastery_after != null && (
                <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  掌握度：{Math.round(bt.mastery_before * 100)}% → {Math.round(bt.mastery_after * 100)}%
                </p>
              )}
              <button onClick={() => { useExamStore.setState({ currentBreakthrough: null }); fetchWeaknesses(); }}
                className="px-6 py-2 rounded-xl text-white font-medium"
                style={{ background: "var(--color-primary)" }}>
                返回薄弱点列表
              </button>
            </div>
          )}
        </div>
      );
    }
  }

  // Weakness list
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>🎯 薄弱点突破</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          按优先级排序，高频考点优先突破，每个知识点三阶段攻克
        </p>
      </div>

      {weaknesses.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--color-text-secondary)" }}>
          <div className="text-5xl mb-4">🏆</div>
          <p>暂无薄弱知识点，继续保持！</p>
          <p className="text-sm mt-1">完成更多训练后，系统会自动识别薄弱环节</p>
        </div>
      ) : (
        <div className="space-y-3">
          {weaknesses.map((w, i) => (
            <div key={`${w.knowledge_point_id}-${i}`} className="p-4 rounded-xl flex items-center gap-4"
              style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>{w.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: FREQ_COLORS[w.frequency] + "20", color: FREQ_COLORS[w.frequency] }}>
                    {FREQ_LABELS[w.frequency]}
                  </span>
                  {w.status !== "not_started" && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
                      {w.status === "completed" ? "已突破" : `阶段${w.phase}/3`}
                    </span>
                  )}
                </div>
                <p className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>{w.category} · {w.section}</p>
                <MasteryBar mastery={w.mastery} />
              </div>
              <button onClick={() => handleStartBreakthrough(w.knowledge_point_id)}
                disabled={w.status === "completed"}
                className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: w.status === "completed" ? "#9ca3af" : "var(--color-primary)" }}>
                {w.status === "not_started" ? "开始突破" : w.status === "completed" ? "已完成" : "继续"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
