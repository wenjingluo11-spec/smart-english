"use client";

import { useState } from "react";
import { useClinicStore } from "@/stores/clinic";

export default function TreatmentSession() {
  const { currentPlan, submitExercise } = useClinicStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  if (!currentPlan) return null;

  const exercises = currentPlan.exercises_json?.exercises || [];
  const exercise = exercises[currentIndex];
  if (!exercise) return null;

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      const res = await submitExercise(currentPlan.id, currentIndex, answer);
      setResult(res);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleNext = () => {
    setCurrentIndex((i) => i + 1);
    setAnswer("");
    setResult(null);
  };

  const progress = ((currentIndex + (result ? 1 : 0)) / exercises.length) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>💊 治疗练习</h2>
        <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {currentIndex + 1} / {exercises.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full" style={{ background: "var(--color-bg)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "var(--color-primary)" }} />
      </div>

      <div className="rounded-xl p-6" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
            {exercise.type === "choice" ? "选择" : exercise.type === "fill" ? "填空" : "改写"}
          </span>
        </div>

        <p className="text-sm mb-4" style={{ color: "var(--color-text)" }}>{exercise.question}</p>

        {exercise.type === "choice" && exercise.options ? (
          <div className="space-y-2 mb-4">
            {exercise.options.map((opt: string, i: number) => (
              <button
                key={i}
                onClick={() => setAnswer(opt.charAt(0))}
                disabled={!!result}
                className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  background: answer === opt.charAt(0) ? "var(--color-primary-light)" : "var(--color-bg)",
                  color: answer === opt.charAt(0) ? "var(--color-primary)" : "var(--color-text)",
                  border: `1px solid ${answer === opt.charAt(0) ? "var(--color-primary)" : "var(--color-border)"}`,
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={!!result}
            placeholder="输入你的答案..."
            className="w-full px-3 py-2 rounded-lg text-sm mb-4"
            style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
            onKeyDown={(e) => e.key === "Enter" && !result && handleSubmit()}
          />
        )}

        {!result ? (
          <button
            onClick={handleSubmit}
            disabled={!answer.trim() || loading}
            className="w-full py-2.5 rounded-lg text-white text-sm font-medium"
            style={{ background: "var(--color-primary)", opacity: !answer.trim() || loading ? 0.5 : 1 }}
          >
            {loading ? "检查中..." : "提交答案"}
          </button>
        ) : (
          <div className="space-y-3">
            <div
              className="p-3 rounded-lg text-sm"
              style={{
                background: result.is_correct ? "#dcfce7" : "#fef2f2",
                color: result.is_correct ? "#166534" : "#991b1b",
              }}
            >
              <p className="font-medium">
                {result.is_correct ? "✅ 正确！" : `❌ 错误，正确答案：${result.correct_answer}`}
              </p>
              <p className="mt-1 text-xs">{String(result.explanation || "")}</p>
            </div>

            {currentIndex < exercises.length - 1 ? (
              <button
                onClick={handleNext}
                className="w-full py-2.5 rounded-lg text-white text-sm font-medium"
                style={{ background: "var(--color-primary)" }}
              >
                下一题
              </button>
            ) : (
              <div className="text-center py-4">
                <p className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>🎉 治疗完成！</p>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
                  正确 {Number(result.progress || 0)} / {exercises.length}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
