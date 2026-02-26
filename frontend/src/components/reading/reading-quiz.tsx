"use client";

import { useState } from "react";

interface Question {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

interface ReadingQuizProps {
  questions: Question[];
  onComplete: () => void;
}

export default function ReadingQuiz({ questions, onComplete }: ReadingQuizProps) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const q = questions[current];
  if (!q) return null;

  const handleSelect = (idx: number) => {
    if (showResult) return;
    setSelected(idx);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    if (selected === q.answer) setScore((s) => s + 1);
    setShowResult(true);
  };

  const handleNext = () => {
    setSelected(null);
    setShowResult(false);
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      onComplete();
    }
  };

  const finished = showResult && current === questions.length - 1;

  return (
    <div className="mt-6 border-t pt-6 animate-slide-up" style={{ borderColor: "var(--color-border)" }}>
      <h4 className="font-medium mb-1 text-sm" style={{ color: "var(--color-text)" }}>
        阅读理解 ({current + 1}/{questions.length})
      </h4>
      <p className="text-sm mb-3" style={{ color: "var(--color-text)" }}>{q.question}</p>

      <div className="space-y-2 mb-4">
        {q.options.map((opt, idx) => {
          let bg = "var(--color-surface)";
          let border = "var(--color-border)";
          if (showResult) {
            if (idx === q.answer) { bg = "#dcfce7"; border = "#22c55e"; }
            else if (idx === selected && idx !== q.answer) { bg = "#fee2e2"; border = "#ef4444"; }
          } else if (idx === selected) {
            bg = "var(--color-primary-light, #dbeafe)";
            border = "var(--color-primary)";
          }
          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm border transition-colors"
              style={{ background: bg, borderColor: border, color: "var(--color-text)" }}
            >
              {String.fromCharCode(65 + idx)}. {opt}
            </button>
          );
        })}
      </div>

      {showResult && q.explanation && (
        <div className="text-sm p-3 rounded-lg mb-4" style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}>
          {q.explanation}
        </div>
      )}

      {!showResult ? (
        <button
          onClick={handleSubmit}
          disabled={selected === null}
          className="px-5 py-2 rounded-lg text-sm text-white transition-colors disabled:opacity-50"
          style={{ background: "var(--color-primary)" }}
        >
          提交答案
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="px-5 py-2 rounded-lg text-sm text-white transition-colors"
          style={{ background: "var(--color-primary)" }}
        >
          {finished ? `完成 (${score}/${questions.length})` : "下一题"}
        </button>
      )}
    </div>
  );
}
