"use client";

import { useState } from "react";
import ExpertDemo from "@/components/cognitive/ExpertDemo";
import { useEnhancementConfig } from "@/hooks/use-enhancement-config";
import FeedbackCollector from "@/components/cognitive/FeedbackCollector";

type SenseMode = "visual" | "audio" | "fusion";
type Intensity = "light" | "medium" | "strong";

const MODE_LABELS: Record<SenseMode, string> = {
  visual: "视觉",
  audio: "听觉",
  fusion: "融合",
};

const INTENSITY_LABELS: Record<Intensity, string> = {
  light: "轻度",
  medium: "中度",
  strong: "强力",
};

const INTENSITY_FILTERS: Record<Intensity, string[]> = {
  light: ["question_eye"],
  medium: ["question_eye", "signal_word"],
  strong: [],
};

interface MultimodalEnhancerProps {
  questionText: string;
  questionId: number;
  source: "practice" | "exam";
  className?: string;
  onFinish?: () => void;
}

/**
 * 多模态融合认知增强控制中心 — 视觉/听觉/融合三模式 + 三档强度。
 *
 * V3: 从薄包装升级为融合控制中心，消费 useEnhancementConfig 设置默认强度。
 */
export default function MultimodalEnhancer({
  questionText,
  questionId,
  source,
  className = "",
  onFinish,
}: MultimodalEnhancerProps) {
  const { config, loaded } = useEnhancementConfig();

  const defaultIntensity: Intensity = !loaded ? "medium"
    : config.level === "minimal" ? "light"
    : config.level === "intensive" ? "strong"
    : "medium";

  const [mode, setMode] = useState<SenseMode>("fusion");
  const [showFeedback, setShowFeedback] = useState(false);
  const [intensity, setIntensity] = useState<Intensity>(defaultIntensity);

  // Sync default intensity once config loads
  const [synced, setSynced] = useState(false);
  if (loaded && !synced) {
    setIntensity(defaultIntensity);
    setSynced(true);
  }

  const showHighlights = mode !== "audio";
  const showAudio = mode !== "visual";
  const highlightFilter = intensity === "strong" ? undefined : INTENSITY_FILTERS[intensity];

  return (
    <div className={className}>
      {/* 控制栏 */}
      <div className="flex items-center gap-4 mb-2 flex-wrap">
        {/* 模式切换 */}
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "var(--color-bg)" }}>
          {(Object.keys(MODE_LABELS) as SenseMode[]).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                mode === m ? "bg-blue-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* 强度切换 */}
        <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: "var(--color-bg)" }}>
          {(Object.keys(INTENSITY_LABELS) as Intensity[]).map((lvl) => (
            <button key={lvl} onClick={() => setIntensity(lvl)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                intensity === lvl ? "bg-purple-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {INTENSITY_LABELS[lvl]}
            </button>
          ))}
        </div>
      </div>

      {/* ExpertDemo with mode-driven props */}
      {showHighlights || showAudio ? (
        <ExpertDemo
          questionText={questionText}
          questionId={questionId}
          source={source}
          semanticMode={showHighlights && showAudio}
          spotlightEnabled={intensity === "strong" && showHighlights}
          highlightFilter={showHighlights ? highlightFilter : ["__none__"]}
          onFinish={() => { setShowFeedback(true); onFinish?.(); }}
        />
      ) : null}

      {showFeedback && (
        <FeedbackCollector
          questionId={questionId}
          source={source}
          className="mt-3 justify-center"
        />
      )}
    </div>
  );
}
