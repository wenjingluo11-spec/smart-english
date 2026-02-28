"use client";

import { useState } from "react";
import { useEnhancementConfig } from "@/hooks/use-enhancement-config";
import { api } from "@/lib/api";
import MultimodalEnhancer from "@/components/cognitive/MultimodalEnhancer";
import FeedbackCollector from "@/components/cognitive/FeedbackCollector";

interface CognitiveEntryButtonProps {
  questionId: number;
  questionText: string;
  source: "practice" | "exam";
  className?: string;
}

export default function CognitiveEntryButton({
  questionId,
  questionText,
  source,
  className = "",
}: CognitiveEntryButtonProps) {
  const [open, setOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const { config, loaded } = useEnhancementConfig();

  if (questionId <= 0) return null;
  if (loaded && !config.show_expert_demo) return null;

  const handleOpen = () => {
    setOpen(true);
    setFinished(false);
    api.post("/behavior/events", {
      event_type: "demo_play",
      event_data: { question_id: questionId, source },
    }).catch(() => {});
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full text-white text-xs font-bold shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95 ${className}`}
        style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
      >
        学霸审题
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-6"
            style={{ background: "var(--color-card)" }}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-lg"
              style={{ background: "var(--color-bg)", color: "var(--color-text-secondary)" }}
            >
              x
            </button>

            <MultimodalEnhancer
              questionText={questionText}
              questionId={questionId}
              source={source}
              onFinish={() => setFinished(true)}
            />

            {finished && (
              <FeedbackCollector
                questionId={questionId}
                source={source}
                className="mt-4 justify-center"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
