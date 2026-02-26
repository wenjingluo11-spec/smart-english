"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface Exercise {
  type: string;
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
}

interface Props {
  exercise: Exercise;
  lessonId: number;
  exerciseIndex: number;
}

export default function ExerciseCard({ exercise, lessonId, exerciseIndex }: Props) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ is_correct: boolean; correct_answer: string; explanation: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      const res = await api.post<{ is_correct: boolean; correct_answer: string; explanation: string }>(
        "/screenshot/exercise",
        { lesson_id: lessonId, exercise_index: exerciseIndex, answer }
      );
      setResult(res);
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="rounded-xl p-4" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
          {exercise.type === "choice" ? "选择" : exercise.type === "fill" ? "填空" : "改写"}
        </span>
        <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>第 {exerciseIndex + 1} 题</span>
      </div>

      <p className="text-sm mb-3" style={{ color: "var(--color-text)" }}>{exercise.question}</p>

      {exercise.type === "choice" && exercise.options ? (
        <div className="space-y-2 mb-3">
          {exercise.options.map((opt, i) => (
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
          className="w-full px-3 py-2 rounded-lg text-sm mb-3"
          style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
      )}

      {!result ? (
        <button
          onClick={handleSubmit}
          disabled={!answer.trim() || loading}
          className="w-full py-2 rounded-lg text-white text-sm font-medium"
          style={{ background: "var(--color-primary)", opacity: !answer.trim() || loading ? 0.5 : 1 }}
        >
          {loading ? "检查中..." : "提交答案"}
        </button>
      ) : (
        <div
          className="p-3 rounded-lg text-sm"
          style={{
            background: result.is_correct ? "#dcfce7" : "#fef2f2",
            color: result.is_correct ? "#166534" : "#991b1b",
          }}
        >
          <p className="font-medium">{result.is_correct ? "✅ 正确！" : `❌ 错误，正确答案：${result.correct_answer}`}</p>
          <p className="mt-1 text-xs">{result.explanation}</p>
        </div>
      )}
    </div>
  );
}
