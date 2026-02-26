"use client";

import { useState } from "react";

interface ReviewCardProps {
  word: string;
  definition: string;
  onFeedback: (feedback: "known" | "fuzzy" | "forgot") => void;
}

export default function ReviewCard({ word, definition, onFeedback }: ReviewCardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="card-flip" style={{ height: 220 }}>
        <div
          className={`card-inner w-full h-full cursor-pointer ${flipped ? "flipped" : ""}`}
          onClick={() => setFlipped(!flipped)}
        >
          {/* Front */}
          <div
            className="card-front rounded-2xl border flex flex-col items-center justify-center p-6"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <span className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>点击翻转查看释义</span>
            <span className="text-3xl font-bold" style={{ color: "var(--color-text)" }}>{word}</span>
          </div>
          {/* Back */}
          <div
            className="card-back rounded-2xl border flex flex-col items-center justify-center p-6"
            style={{ background: "var(--color-primary-light, var(--color-surface))", borderColor: "var(--color-primary)" }}
          >
            <span className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>释义</span>
            <span className="text-xl font-medium" style={{ color: "var(--color-text)" }}>{definition || "暂无释义"}</span>
          </div>
        </div>
      </div>

      {flipped && (
        <div className="flex justify-center gap-3 mt-6 animate-slide-up">
          <button
            onClick={() => onFeedback("forgot")}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
          >
            不认识
          </button>
          <button
            onClick={() => onFeedback("fuzzy")}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition-colors"
          >
            模糊
          </button>
          <button
            onClick={() => onFeedback("known")}
            className="px-5 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
          >
            认识
          </button>
        </div>
      )}
    </div>
  );
}
