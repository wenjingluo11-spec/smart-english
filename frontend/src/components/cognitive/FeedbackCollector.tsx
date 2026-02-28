"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface FeedbackCollectorProps {
  questionId: number;
  /** Legacy prop for simple star-rating mode */
  source?: "practice" | "exam";
  /** New: gaze path steps for checkbox selection */
  gazePathSteps?: { step: number; thought: string }[];
  /** New: callback when feedback is done */
  onClose?: () => void;
  className?: string;
}

export default function FeedbackCollector({ questionId, source, gazePathSteps, onClose, className = "" }: FeedbackCollectorProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [helpfulSteps, setHelpfulSteps] = useState<number[]>([]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Legacy simple mode: star rating via behavior events
  if (source && !gazePathSteps) {
    const handleLegacy = async (r: number) => {
      setRating(r);
      setSubmitted(true);
      try {
        await api.post("/behavior/events", {
          event_type: "feedback",
          event_data: { question_id: questionId, source, rating: r },
        });
      } catch { /* ignore */ }
    };
    if (submitted) {
      return <div className={`text-center text-sm py-2 ${className}`} style={{ color: "var(--color-text-secondary)" }}>感谢反馈!</div>;
    }
    return (
      <div className={`flex items-center gap-3 py-2 ${className}`}>
        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>体验如何？</span>
        {[1, 2, 3, 4, 5].map((r) => (
          <button key={r} onClick={() => handleLegacy(r)}
            className="text-lg transition-transform hover:scale-125"
            style={{ opacity: rating !== null && rating >= r ? 1 : 0.4 }}>
            {"⭐"}
          </button>
        ))}
      </div>
    );
  }

  // New cognitive feedback mode
  const toggleStep = (idx: number) =>
    setHelpfulSteps((prev) => prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]);

  const handleSubmit = async () => {
    if (rating === null) return;
    setLoading(true);
    try {
      await api.post("/feedback/cognitive", {
        question_id: questionId,
        rating,
        helpful_steps: helpfulSteps.length > 0 ? helpfulSteps : null,
        comment: comment.trim() || null,
      });
      setSubmitted(true);
      if (onClose) setTimeout(onClose, 2000);
    } catch { /* ignore */ }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className={`p-4 rounded-xl text-center ${className}`} style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
        <p className="text-sm font-medium" style={{ color: "#16a34a" }}>感谢你的反馈！</p>
      </div>
    );
  }

  const opts = [
    { value: 1, label: "有帮助", color: "#16a34a", bg: "rgba(34,197,94,0.1)" },
    { value: 2, label: "一般", color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
    { value: 3, label: "没帮助", color: "#dc2626", bg: "rgba(220,38,38,0.1)" },
  ];

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${className}`} style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
      <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>这个审题演示对你有帮助吗？</div>

      <div className="flex gap-2">
        {opts.map((o) => (
          <button key={o.value} onClick={() => setRating(o.value)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: rating === o.value ? o.bg : "transparent",
              color: rating === o.value ? o.color : "var(--color-text-secondary)",
              border: `1.5px solid ${rating === o.value ? o.color : "var(--color-border)"}`,
            }}>
            {o.label}
          </button>
        ))}
      </div>

      {gazePathSteps && gazePathSteps.length > 0 && (
        <div>
          <div className="text-xs mb-1.5" style={{ color: "var(--color-text-secondary)" }}>最有帮助的步骤（可选）</div>
          <div className="flex flex-wrap gap-1.5">
            {gazePathSteps.map((s, idx) => (
              <label key={idx} className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg cursor-pointer"
                style={{ background: helpfulSteps.includes(idx) ? "rgba(59,130,246,0.1)" : "var(--color-surface-hover)" }}>
                <input type="checkbox" checked={helpfulSteps.includes(idx)} onChange={() => toggleStep(idx)} className="w-3 h-3" />
                <span>步骤{s.step}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <textarea value={comment} onChange={(e) => setComment(e.target.value)}
        placeholder="补充说明（可选）" rows={2}
        className="w-full px-3 py-2 rounded-lg text-sm border resize-none"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }} />

      <button onClick={handleSubmit} disabled={rating === null || loading}
        className="w-full py-2 rounded-lg text-sm text-white disabled:opacity-50"
        style={{ background: "var(--color-primary)" }}>
        {loading ? "提交中..." : "提交反馈"}
      </button>
    </div>
  );
}
