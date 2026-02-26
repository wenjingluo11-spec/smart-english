"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface Question {
  index: number;
  difficulty: string;
  content: string;
  options: string[];
}

interface AssessmentStepProps {
  onComplete: (result: { score: number; correct: number; total: number; cefr_level: string }) => void;
}

export default function AssessmentStep({ onComplete }: AssessmentStepProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const startAssessment = async () => {
    const data = await api.get<{ questions: Question[] }>("/onboarding/assessment");
    setQuestions(data.questions);
    setStarted(true);
  };

  const selectAnswer = (answer: string) => {
    setAnswers({ ...answers, [current]: answer });
  };

  const handleSubmit = async () => {
    setLoading(true);
    const answerList = Object.entries(answers).map(([idx, ans]) => ({
      question_index: Number(idx),
      answer: ans.charAt(0), // Extract letter from "A. xxx"
    }));
    try {
      const result = await api.post<{ score: number; correct: number; total: number; cefr_level: string }>(
        "/onboarding/assessment",
        { answers: answerList }
      );
      onComplete(result);
    } catch { /* ignore */ }
    setLoading(false);
  };

  if (!started) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">📝</div>
        <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-text)" }}>英语水平快速测评</h3>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
          10 道题，约 3 分钟，帮助我们了解你的英语水平
        </p>
        <button
          onClick={startAssessment}
          className="px-6 py-2.5 rounded-lg text-sm font-medium text-white"
          style={{ background: "var(--color-primary)" }}
        >
          开始测评
        </button>
      </div>
    );
  }

  const q = questions[current];
  if (!q) return null;

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {current + 1} / {questions.length}
        </span>
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--color-primary-light, #dbeafe)", color: "var(--color-primary)" }}>
          {q.difficulty}
        </span>
      </div>
      <div className="h-1.5 rounded-full mb-6" style={{ background: "var(--color-border)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${((current + 1) / questions.length) * 100}%`, background: "var(--color-primary)" }}
        />
      </div>

      {/* Question */}
      <div className="text-sm font-medium mb-4" style={{ color: "var(--color-text)" }}>{q.content}</div>

      {/* Options */}
      <div className="space-y-2 mb-6">
        {q.options.map((opt) => (
          <button
            key={opt}
            onClick={() => selectAnswer(opt)}
            className={`w-full text-left text-sm px-4 py-3 rounded-lg border transition-all ${
              answers[current] === opt ? "border-2 font-medium" : ""
            }`}
            style={{
              borderColor: answers[current] === opt ? "var(--color-primary)" : "var(--color-border)",
              background: answers[current] === opt ? "var(--color-primary-light, #dbeafe)" : "var(--color-surface)",
              color: "var(--color-text)",
            }}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrent(Math.max(0, current - 1))}
          disabled={current === 0}
          className="text-sm px-4 py-2 rounded-lg border disabled:opacity-30"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
        >
          上一题
        </button>
        {current < questions.length - 1 ? (
          <button
            onClick={() => setCurrent(current + 1)}
            disabled={!answers[current]}
            className="text-sm px-4 py-2 rounded-lg text-white disabled:opacity-30"
            style={{ background: "var(--color-primary)" }}
          >
            下一题
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading || Object.keys(answers).length < questions.length}
            className="text-sm px-6 py-2 rounded-lg text-white disabled:opacity-30"
            style={{ background: "var(--color-primary)" }}
          >
            {loading ? "评估中..." : "提交测评"}
          </button>
        )}
      </div>
    </div>
  );
}
