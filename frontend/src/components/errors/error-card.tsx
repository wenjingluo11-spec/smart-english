"use client";

import { useState } from "react";

interface ErrorCardProps {
  entry: {
    id: number;
    source_type: string;
    question_snapshot: string;
    question_type: string;
    topic: string;
    difficulty: number;
    user_answer: string;
    correct_answer: string;
    explanation: string;
    status: string;
    retry_count: number;
    created_at: string;
  };
  onRetry: (id: number, answer: string) => Promise<Record<string, unknown>>;
  onMaster: (id: number) => void;
  onDelete: (id: number) => void;
}

const sourceLabels: Record<string, string> = {
  practice: "练习",
  exam: "考试",
  mock: "模考",
};

const difficultyColors = ["", "#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"];

export default function ErrorCard({ entry, onRetry, onMaster, onDelete }: ErrorCardProps) {
  const [showRetry, setShowRetry] = useState(false);
  const [answer, setAnswer] = useState("");
  const [retryResult, setRetryResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      const result = await onRetry(entry.id, answer);
      setRetryResult(result);
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div
      className="rounded-xl border p-4 transition-all hover:shadow-sm"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--color-primary-light, #dbeafe)", color: "var(--color-primary)" }}>
            {sourceLabels[entry.source_type] || entry.source_type}
          </span>
          {entry.topic && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--color-border)", color: "var(--color-text-secondary)" }}>
              {entry.topic}
            </span>
          )}
          {entry.question_type && (
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {entry.question_type}
            </span>
          )}
          <span className="text-xs font-medium" style={{ color: difficultyColors[entry.difficulty] || "#888" }}>
            {"★".repeat(entry.difficulty)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {entry.status === "mastered" && (
            <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">已掌握</span>
          )}
          {entry.retry_count > 0 && (
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              重做 {entry.retry_count} 次
            </span>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="text-sm mb-3 whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
        {entry.question_snapshot}
      </div>

      {/* Answers comparison */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-lg p-2" style={{ background: "rgba(239,68,68,0.08)" }}>
          <div className="text-xs font-medium text-red-600 mb-1">你的答案</div>
          <div className="text-sm text-red-700">{entry.user_answer}</div>
        </div>
        <div className="rounded-lg p-2" style={{ background: "rgba(34,197,94,0.08)" }}>
          <div className="text-xs font-medium text-green-600 mb-1">正确答案</div>
          <div className="text-sm text-green-700">{entry.correct_answer}</div>
        </div>
      </div>

      {/* Explanation */}
      {entry.explanation && (
        <div className="text-xs rounded-lg p-2 mb-3" style={{ background: "var(--color-border)", color: "var(--color-text-secondary)" }}>
          {entry.explanation}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {entry.status !== "mastered" && (
          <>
            <button
              onClick={() => { setShowRetry(!showRetry); setRetryResult(null); setAnswer(""); }}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: "var(--color-primary)", color: "#fff" }}
            >
              重做
            </button>
            <button
              onClick={() => onMaster(entry.id)}
              className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
            >
              标记掌握
            </button>
          </>
        )}
        <button
          onClick={() => onDelete(entry.id)}
          className="text-xs px-3 py-1.5 rounded-lg border transition-colors ml-auto"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
        >
          删除
        </button>
      </div>

      {/* Retry panel */}
      {showRetry && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--color-border)" }}>
          {retryResult ? (
            <div className={`text-sm p-3 rounded-lg ${retryResult.is_correct ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {retryResult.is_correct ? "回答正确！已标记为掌握。" : `回答错误。${retryResult.explanation || ""}`}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="输入你的答案..."
                className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
                onKeyDown={(e) => e.key === "Enter" && handleRetry()}
              />
              <button
                onClick={handleRetry}
                disabled={loading || !answer.trim()}
                className="text-xs px-4 py-1.5 rounded-lg disabled:opacity-50"
                style={{ background: "var(--color-primary)", color: "#fff" }}
              >
                {loading ? "判题中..." : "提交"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
