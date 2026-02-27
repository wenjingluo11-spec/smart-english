"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { API_BASE } from "@/lib/api";

interface GazeStep {
  step: number;
  target_text: string;
  action: "focus" | "scan" | "compare" | "skip" | "return";
  highlight_type?: "question_eye" | "signal_word" | "key_info" | "context_clue" | "distractor" | "normal";
  duration_ms: number;
  thought: string;
}

interface MultimodalEnhancerProps {
  /** 题目原文 */
  questionText: string;
  /** 题目ID */
  questionId: number;
  /** 题目来源 */
  source: "practice" | "exam";
  className?: string;
  /** 演示结束回调 */
  onFinish?: () => void;
}

/** action -> 视觉样式 */
const ACTION_STYLES: Record<string, { bg: string; border: string; label: string }> = {
  focus: { bg: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.5)", label: "聚焦" },
  scan: { bg: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", label: "扫读" },
  compare: { bg: "rgba(245,158,11,0.15)", border: "2px solid rgba(245,158,11,0.5)", label: "对比" },
  skip: { bg: "rgba(156,163,175,0.1)", border: "1px dashed rgba(156,163,175,0.4)", label: "跳过" },
  return: { bg: "rgba(139,92,246,0.12)", border: "2px solid rgba(139,92,246,0.4)", label: "回看" },
};

/** highlight_type -> 语义色彩 */
const SEMANTIC_STYLES: Record<string, { underline: string; badge: string; label: string }> = {
  question_eye: { underline: "#dc2626", badge: "#dc2626", label: "题眼" },
  signal_word: { underline: "#d97706", badge: "#d97706", label: "信号词" },
  key_info: { underline: "#2563eb", badge: "#2563eb", label: "关键信息" },
  context_clue: { underline: "#0891b2", badge: "#0891b2", label: "线索" },
  distractor: { underline: "#9ca3af", badge: "#9ca3af", label: "干扰" },
  normal: { underline: "transparent", badge: "#6b7280", label: "" },
};

/**
 * 多模态融合认知增强组件 — 视觉高亮 + 听觉TTS + 光标跟随三者同步。
 *
 * 研讨核心要求："听觉上要语音合成，视觉上要做光标跟随，然后视觉听觉加在一起"
 *
 * 工作流程：
 * 1. 加载 gaze_path + narration TTS 数据
 * 2. 播放时：光标按 gaze_path 步骤移动，语义高亮同步激活，TTS 旁白同步播放
 * 3. 已经过的步骤保留语义色彩标注（题眼/信号词等），形成渐进式标注效果
 */
export default function MultimodalEnhancer({
  questionText,
  questionId,
  source,
  className = "",
  onFinish,
}: MultimodalEnhancerProps) {
  const [gazeSteps, setGazeSteps] = useState<GazeStep[]>([]);
  const [narration, setNarration] = useState("");
  const [audioKey, setAudioKey] = useState<string | null>(null);
  const [demoSource, setDemoSource] = useState<"ai" | "human">("ai");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [speed, setSpeed] = useState(1);
  // 记录已经过的步骤，用于保留语义标注
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set());

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
      const steps = data.demo?.gaze_path || [];
      setGazeSteps(steps);
      stepsRef.current = steps;
      setNarration(data.demo?.narration || "");
      setDemoSource(data.demo?.source || "ai");
      setAudioKey(data.tts?.audio_key || null);
    } catch (e: unknown) {
      setError((e as Error).message || "加载失败");
    } finally {
      setLoading(false);
    }
  }, [questionId, source]);

  // 清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  // 播放 gaze_path 动画序列
  const playStep = useCallback((stepIndex: number) => {
    const steps = stepsRef.current;
    if (stepIndex >= steps.length) {
      setPlaying(false);
      setCurrentStep(-1);
      onFinish?.();
      return;
    }
    setCurrentStep(stepIndex);
    setVisitedSteps(prev => new Set(prev).add(stepIndex));
    const delay = steps[stepIndex].duration_ms / speed;
    timerRef.current = setTimeout(() => playStep(stepIndex + 1), delay);
  }, [speed, onFinish]);

  // 开始/暂停
  const togglePlay = useCallback(() => {
    if (!gazeSteps.length) return;
    if (playing) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (audioRef.current) audioRef.current.pause();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    const startFrom = currentStep < 0 ? 0 : currentStep;
    // 同步播放 TTS 旁白
    if (audioKey) {
      const audio = new Audio(`${API_BASE}/tts/audio/${audioKey}`);
      audioRef.current = audio;
      audio.playbackRate = speed;
      audio.play().catch(() => {});
    }
    playStep(startFrom);
  }, [gazeSteps, playing, currentStep, speed, audioKey, playStep]);

  // 重播
  const replay = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setCurrentStep(-1);
    setVisitedSteps(new Set());
    setPlaying(false);
    setTimeout(() => togglePlay(), 50);
  }, [togglePlay]);

  // 速度变化时更新音频播放速率
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  // 当前步骤数据
  const step = currentStep >= 0 && gazeSteps[currentStep] ? gazeSteps[currentStep] : null;
  const actionStyle = step ? ACTION_STYLES[step.action] || ACTION_STYLES.focus : null;

  // 渲染题目文本：当前步骤高亮 + 已访问步骤保留语义色彩
  const renderText = () => {
    if (!gazeSteps.length) return <span>{questionText}</span>;

    // 收集所有需要标注的区域
    type Region = { start: number; end: number; stepIdx: number; isCurrent: boolean };
    const regions: Region[] = [];

    for (let i = 0; i < gazeSteps.length; i++) {
      if (i !== currentStep && !visitedSteps.has(i)) continue;
      const s = gazeSteps[i];
      let idx = questionText.indexOf(s.target_text);
      if (idx < 0) idx = questionText.toLowerCase().indexOf(s.target_text.toLowerCase());
      if (idx < 0) continue;
      regions.push({ start: idx, end: idx + s.target_text.length, stepIdx: i, isCurrent: i === currentStep });
    }

    // 按 start 排序，去重重叠
    regions.sort((a, b) => a.start - b.start);
    const merged: Region[] = [];
    for (const r of regions) {
      if (merged.length > 0 && r.start < merged[merged.length - 1].end) {
        // 重叠时优先保留 current
        if (r.isCurrent) merged[merged.length - 1] = r;
        continue;
      }
      merged.push(r);
    }

    // 构建渲染片段
    const parts: JSX.Element[] = [];
    let cursor = 0;

    for (const r of merged) {
      if (r.start > cursor) {
        parts.push(<span key={`t-${cursor}`} style={{ color: "var(--color-text-secondary)" }}>{questionText.slice(cursor, r.start)}</span>);
      }
      const gs = gazeSteps[r.stepIdx];
      const ht = gs.highlight_type || "normal";
      const semantic = SEMANTIC_STYLES[ht] || SEMANTIC_STYLES.normal;
      const aStyle = r.isCurrent ? (ACTION_STYLES[gs.action] || ACTION_STYLES.focus) : null;

      parts.push(
        <span
          key={`h-${r.start}`}
          className={`relative inline-block transition-all duration-300 rounded-sm px-0.5 ${r.isCurrent ? "animate-pulse-subtle" : ""}`}
          style={{
            background: r.isCurrent ? aStyle?.bg : (ht !== "normal" ? `${semantic.underline}15` : "transparent"),
            border: r.isCurrent ? aStyle?.border : undefined,
            borderBottom: !r.isCurrent && ht !== "normal" ? `2px solid ${semantic.underline}` : undefined,
            color: "var(--color-text)",
            fontWeight: r.isCurrent || ht === "question_eye" ? 600 : 400,
            padding: r.isCurrent ? "1px 4px" : undefined,
          }}
        >
          {questionText.slice(r.start, r.end)}
          {/* 当前步骤的光标指示器 */}
          {r.isCurrent && (
            <span
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 animate-bounce"
              style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "6px solid #3b82f6" }}
            />
          )}
          {/* 语义标签 */}
          {ht !== "normal" && semantic.label && (
            <span
              className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] px-1 py-0.5 rounded whitespace-nowrap text-white opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: semantic.badge, opacity: r.isCurrent ? 1 : 0.7 }}
            >
              {semantic.label}
            </span>
          )}
        </span>
      );
      cursor = r.end;
    }

    if (cursor < questionText.length) {
      parts.push(<span key={`t-${cursor}`} style={{ color: "var(--color-text-secondary)" }}>{questionText.slice(cursor)}</span>);
    }

    return <>{parts}</>;
  };

  // 未加载
  if (!gazeSteps.length && !loading) {
    return (
      <div className={className}>
        <button
          onClick={loadDemo}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium
                     bg-gradient-to-r from-red-50 via-blue-50 to-purple-50 text-blue-600
                     hover:from-red-100 hover:via-blue-100 hover:to-purple-100 transition-all border border-blue-100"
        >
          <span className="flex gap-0.5 items-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          </span>
          多模态审题演示
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 p-4 rounded-xl ${className}`} style={{ background: "var(--color-surface-hover)" }}>
        <span className="animate-spin text-blue-500">&#x27F3;</span>
        <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>正在生成多模态审题演示...</span>
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

  return (
    <div className={`rounded-2xl overflow-hidden ${className}`} style={{ border: "1px solid var(--color-border)" }}>
      {/* 头部控制栏 */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(59,130,246,0.06), rgba(139,92,246,0.06))", borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: "#2563eb" }}>
            <span className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              +
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              多模态审题
            </span>
          </span>
          {demoSource === "human" && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-600">真人标注</span>
          )}
        </div>
        <div className="flex items-center gap-2">
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

      {/* 题目文本 + 融合高亮 */}
      <div className="p-4">
        <div className="text-base leading-loose whitespace-pre-wrap mb-4 group">
          {renderText()}
        </div>

        {/* 内心独白气泡 */}
        {step && (
          <div
            className="flex items-start gap-2 p-3 rounded-xl mb-3"
            style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}
          >
            <span className="text-lg shrink-0">&#x1F4AD;</span>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: actionStyle?.bg, color: "var(--color-text)" }}>
                  {actionStyle?.label}
                </span>
                {step.highlight_type && step.highlight_type !== "normal" && (
                  <span className="text-xs px-1.5 py-0.5 rounded text-white"
                    style={{ background: (SEMANTIC_STYLES[step.highlight_type] || SEMANTIC_STYLES.normal).badge }}>
                    {(SEMANTIC_STYLES[step.highlight_type] || SEMANTIC_STYLES.normal).label}
                  </span>
                )}
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  步骤 {step.step}/{gazeSteps.length}
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
              width: `${gazeSteps.length > 0 ? ((currentStep + 1) / gazeSteps.length) * 100 : 0}%`,
              background: "linear-gradient(90deg, #dc2626, #3b82f6, #8b5cf6)",
            }}
          />
        </div>

        {/* 播放控制 */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              playing ? "bg-gray-100 text-gray-700 hover:bg-gray-200" : "bg-blue-500 text-white hover:bg-blue-600"
            }`}
          >
            {playing ? "&#x23F8; 暂停" : currentStep > 0 ? "&#x25B6; 继续" : "&#x25B6; 开始演示"}
          </button>
          {currentStep > 0 && (
            <button onClick={replay} className="px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors">
              &#x21BB; 重播
            </button>
          )}
          {/* 音频波形指示 */}
          {playing && (
            <div className="flex gap-0.5 items-end h-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="w-0.5 bg-blue-500 rounded-full animate-pulse"
                  style={{ height: `${4 + Math.random() * 10}px`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          )}
        </div>

        {/* 语义图例 */}
        {visitedSteps.size > 0 && (
          <div className="flex flex-wrap gap-3 mt-3 pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
            {Object.entries(SEMANTIC_STYLES)
              .filter(([key]) => key !== "normal" && gazeSteps.some((s, i) => visitedSteps.has(i) && s.highlight_type === key))
              .map(([key, style]) => (
                <span key={key} className="flex items-center gap-1 text-xs" style={{ color: style.badge }}>
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: `${style.underline}20`, borderBottom: `2px solid ${style.underline}` }} />
                  {style.label}
                </span>
              ))}
          </div>
        )}

        {/* 旁白文本 */}
        {narration && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
            <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>审题旁白</div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>{narration}</p>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .animate-pulse-subtle { animation: pulse-subtle 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
