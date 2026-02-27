"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { API_BASE } from "@/lib/api";

interface GazeStep {
  step: number;
  target_text: string;
  action: "focus" | "scan" | "compare" | "skip" | "return";
  duration_ms: number;
  thought: string;
}

interface DemoData {
  gaze_path: GazeStep[];
  narration: string;
  source: "ai" | "human";
}

interface TtsData {
  audio_key: string;
  word_boundaries: { text: string; offset_ms: number; duration_ms: number }[];
}

interface ExpertDemoProps {
  /** 题目原文 */
  questionText: string;
  /** 题目ID */
  questionId: number;
  /** 题目来源: practice 或 exam */
  source: "practice" | "exam";
  className?: string;
  /** 演示结束回调 */
  onFinish?: () => void;
}

/** action → 视觉样式 */
const ACTION_STYLES: Record<string, { bg: string; border: string; label: string }> = {
  focus: { bg: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.5)", label: "聚焦" },
  scan: { bg: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", label: "扫读" },
  compare: { bg: "rgba(245,158,11,0.15)", border: "2px solid rgba(245,158,11,0.5)", label: "对比" },
  skip: { bg: "rgba(156,163,175,0.1)", border: "1px dashed rgba(156,163,175,0.4)", label: "跳过" },
  return: { bg: "rgba(139,92,246,0.12)", border: "2px solid rgba(139,92,246,0.4)", label: "回看" },
};

/**
 * 学霸审题演示组件 — 模拟学霸的审题过程。
 *
 * 功能：
 * 1. 光标自动移动到题目各个位置（gaze_path 驱动）
 * 2. 当前聚焦词高亮 + 内心独白气泡
 * 3. 配合语音旁白（TTS + 视听同步）
 * 4. 可暂停、回放、调速
 */
export default function ExpertDemo({
  questionText,
  questionId,
  source,
  className = "",
  onFinish,
}: ExpertDemoProps) {
  const [demoData, setDemoData] = useState<DemoData | null>(null);
  const [ttsData, setTtsData] = useState<TtsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepsRef = useRef<GazeStep[]>([]);

  // 加载演示数据
  const loadDemo = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/cognitive/demo/${source}/${questionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setDemoData(data.demo);
      setTtsData(data.tts);
      stepsRef.current = data.demo?.gaze_path || [];
    } catch (e: any) {
      setError(e.message || "加载演示数据失败");
    } finally {
      setLoading(false);
    }
  }, [questionId, source]);

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 播放 gaze_path 动画序列
  const playStep = useCallback(
    (stepIndex: number) => {
      const steps = stepsRef.current;
      if (stepIndex >= steps.length) {
        setPlaying(false);
        setCurrentStep(-1);
        onFinish?.();
        return;
      }

      setCurrentStep(stepIndex);
      const step = steps[stepIndex];
      const delay = step.duration_ms / speed;

      timerRef.current = setTimeout(() => {
        playStep(stepIndex + 1);
      }, delay);
    },
    [speed, onFinish]
  );

  // 开始/暂停
  const togglePlay = useCallback(() => {
    if (!demoData || !demoData.gaze_path.length) return;

    if (playing) {
      // 暂停
      if (timerRef.current) clearTimeout(timerRef.current);
      if (audioRef.current) audioRef.current.pause();
      setPlaying(false);
      return;
    }

    // 开始
    setPlaying(true);
    const startFrom = currentStep < 0 ? 0 : currentStep;

    // 播放旁白音频
    if (ttsData?.audio_key) {
      const audio = new Audio(`${API_BASE}/tts/audio/${ttsData.audio_key}`);
      audioRef.current = audio;
      audio.playbackRate = speed;
      audio.play().catch(() => {});
    }

    playStep(startFrom);
  }, [demoData, ttsData, playing, currentStep, speed, playStep]);

  // 重播
  const replay = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setCurrentStep(-1);
    setPlaying(false);
    // 延迟一帧后开始
    setTimeout(() => togglePlay(), 50);
  }, [togglePlay]);

  // 速度变化时更新音频播放速率
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

  // 当前步骤数据
  const step = currentStep >= 0 && demoData ? demoData.gaze_path[currentStep] : null;
  const actionStyle = step ? ACTION_STYLES[step.action] || ACTION_STYLES.focus : null;

  // 在题目文本中高亮当前 target_text
  const renderHighlightedText = () => {
    if (!step) return <span>{questionText}</span>;

    const target = step.target_text;
    const idx = questionText.indexOf(target);
    if (idx < 0) {
      const lowerIdx = questionText.toLowerCase().indexOf(target.toLowerCase());
      if (lowerIdx < 0) return <span>{questionText}</span>;
      return renderWithHighlight(lowerIdx, lowerIdx + target.length);
    }
    return renderWithHighlight(idx, idx + target.length);
  };

  const renderWithHighlight = (start: number, end: number) => (
    <>
      <span style={{ color: "var(--color-text-secondary)" }}>{questionText.slice(0, start)}</span>
      <span
        className="relative inline-block transition-all duration-300"
        style={{
          background: actionStyle?.bg,
          border: actionStyle?.border,
          borderRadius: "4px",
          padding: "1px 4px",
          color: "var(--color-text)",
          fontWeight: 600,
        }}
      >
        {questionText.slice(start, end)}
        {/* 光标指示器 */}
        <span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 animate-bounce"
          style={{
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderBottom: "6px solid #3b82f6",
          }}
        />
      </span>
      <span style={{ color: "var(--color-text-secondary)" }}>{questionText.slice(end)}</span>
    </>
  );

  // 未加载
  if (!demoData && !loading) {
    return (
      <div className={`${className}`}>
        <button
          onClick={loadDemo}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium
                     bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600
                     hover:from-blue-100 hover:to-purple-100 transition-all border border-blue-100"
        >
          👁 看学霸怎么做
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 p-4 rounded-xl ${className}`} style={{ background: "var(--color-surface-hover)" }}>
        <span className="animate-spin text-blue-500">⟳</span>
        <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>正在生成学霸审题演示...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-3 rounded-xl text-sm ${className}`} style={{ background: "rgba(239,68,68,0.06)", color: "#ef4444" }}>
        {error}
        <button onClick={loadDemo} className="ml-2 underline">重试</button>
      </div>
    );
  }

  if (!demoData?.gaze_path?.length) {
    return null;
  }

  return (
    <div className={`rounded-2xl overflow-hidden ${className}`} style={{ border: "1px solid var(--color-border)" }}>
      {/* 头部控制栏 */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.06))", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: "#2563eb" }}>
            👁 学霸审题演示
          </span>
          {demoData.source === "human" && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-600">真人标注</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 速度控制 */}
          {[0.5, 1, 1.5, 2].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                speed === s ? "bg-blue-500 text-white" : "bg-white text-gray-500 hover:bg-gray-100"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* 题目文本 + 高亮 */}
      <div className="p-4">
        <div className="text-base leading-relaxed whitespace-pre-wrap mb-4">
          {renderHighlightedText()}
        </div>

        {/* 内心独白气泡 */}
        {step && (
          <div
            className="flex items-start gap-2 p-3 rounded-xl mb-3 animate-fade-in"
            style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}
          >
            <span className="text-lg shrink-0">💭</span>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: actionStyle?.bg, color: "var(--color-text)" }}
                >
                  {actionStyle?.label}
                </span>
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  步骤 {step.step}/{demoData.gaze_path.length}
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--color-text)" }}>{step.thought}</p>
            </div>
          </div>
        )}

        {/* 进度条 */}
        <div className="h-1 rounded-full mb-3" style={{ background: "var(--color-border)" }}>
          <div
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: `${demoData.gaze_path.length > 0 ? ((currentStep + 1) / demoData.gaze_path.length) * 100 : 0}%`,
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
            }}
          />
        </div>

        {/* 播放控制 */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              playing
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {playing ? "⏸ 暂停" : currentStep > 0 ? "▶ 继续" : "▶ 开始演示"}
          </button>
          {currentStep > 0 && (
            <button
              onClick={replay}
              className="px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors"
            >
              ↻ 重播
            </button>
          )}
        </div>

        {/* 旁白文本 */}
        {demoData.narration && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
            <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>审题旁白</div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
              {demoData.narration}
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}
