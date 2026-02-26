"use client";

import { useState } from "react";
import { useStoryStore } from "@/stores/story";

interface Props {
  challenge: {
    type: string; question: string; options?: string[]; answer: string;
    hint?: string; explanation?: string;
  };
  chapterId: number;
  onClose: () => void;
}

export default function ChallengeModal({ challenge, chapterId, onClose }: Props) {
  const { submitChallenge } = useStoryStore();
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      const res = await submitChallenge(chapterId, answer);
      setResult(res);
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "var(--color-card)" }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold" style={{ color: "var(--color-text)" }}>🎯 英语挑战</h3>
          <button onClick={onClose} className="text-lg" style={{ color: "var(--color-text-secondary)" }}>✕</button>
        </div>

        <p className="text-sm" style={{ color: "var(--color-text)" }}>{challenge.question}</p>

        {challenge.type === "choice" && challenge.options ? (
          <div className="space-y-2">
            {challenge.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setAnswer(opt.charAt(0))}
                disabled={!!result}
                className="w-full text-left px-3 py-2 rounded-lg text-sm"
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
            placeholder="输入答案..."
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
            onKeyDown={(e) => e.key === "Enter" && !result && handleSubmit()}
          />
        )}

        {challenge.hint && !result && (
          <div>
            {showHint ? (
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>💡 {challenge.hint}</p>
            ) : (
              <button onClick={() => setShowHint(true)} className="text-xs" style={{ color: "var(--color-primary)" }}>显示提示</button>
            )}
          </div>
        )}

        {!result ? (
          <button
            onClick={handleSubmit}
            disabled={!answer.trim() || loading}
            className="w-full py-2.5 rounded-lg text-white text-sm font-medium"
            style={{ background: "var(--color-primary)", opacity: !answer.trim() || loading ? 0.5 : 1 }}
          >
            {loading ? "检查中..." : "提交"}
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
              <p className="font-medium">{result.is_correct ? "✅ 正确！" : `❌ 正确答案：${String(result.correct_answer)}`}</p>
              {result.explanation ? <p className="mt-1 text-xs">{String(result.explanation)}</p> : null}
            </div>
            <button onClick={onClose} className="w-full py-2 rounded-lg text-sm" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
