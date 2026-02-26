"use client";

import { useState } from "react";
import ReviewCard from "./review-card";
import XPToast from "@/components/ui/xp-toast";
import { api } from "@/lib/api";

interface DueWord {
  id: number;
  word: string;
  definition: string;
  status: string;
}

interface ReviewSessionProps {
  words: DueWord[];
  onComplete: () => void;
}

export default function ReviewSession({ words, onComplete }: ReviewSessionProps) {
  const [current, setCurrent] = useState(0);
  const [xpGained, setXpGained] = useState(0);
  const [xpTrigger, setXpTrigger] = useState(0);
  const [stats, setStats] = useState({ known: 0, fuzzy: 0, forgot: 0 });

  const handleFeedback = async (feedback: "known" | "fuzzy" | "forgot") => {
    const word = words[current];
    try {
      const res = await api.post<{ xp?: { xp_gained: number } }>("/vocabulary/review", {
        word_id: word.id,
        feedback,
      });
      if (res.xp?.xp_gained) {
        setXpGained(res.xp.xp_gained);
        setXpTrigger((t) => t + 1);
      }
    } catch {
      // continue anyway
    }

    setStats((s) => ({ ...s, [feedback]: s[feedback] + 1 }));

    if (current < words.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      // Session complete
      onComplete();
    }
  };

  const word = words[current];
  if (!word) return null;

  const progress = ((current + 1) / words.length) * 100;

  return (
    <div className="max-w-md mx-auto">
      <XPToast xpGained={xpGained} trigger={xpTrigger} />

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>
          <span>{current + 1} / {words.length}</span>
          <span>
            <span className="text-green-500">{stats.known}</span>
            {" / "}
            <span className="text-yellow-500">{stats.fuzzy}</span>
            {" / "}
            <span className="text-red-500">{stats.forgot}</span>
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: "var(--color-primary)" }}
          />
        </div>
      </div>

      <ReviewCard
        key={word.id}
        word={word.word}
        definition={word.definition}
        onFeedback={handleFeedback}
      />
    </div>
  );
}
