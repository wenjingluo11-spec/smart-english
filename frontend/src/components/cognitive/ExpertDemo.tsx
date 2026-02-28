"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { API_BASE } from "@/lib/api";
import { useAudioSync, buildStepTimeline, findCurrentStep } from "@/hooks/use-audio-sync";
import { ACTION_STYLES, SEMANTIC_STYLES } from "@/lib/cognitive-styles";
import { useSyncTimeline } from "@/hooks/use-sync-timeline";

interface GazeStep {
  step: number;
  target_text: string;
  action: "focus" | "scan" | "compare" | "skip" | "return";
  highlight_type?: "question_eye" | "signal_word" | "key_info" | "context_clue" | "distractor" | "normal";
  duration_ms: number;
  thought: string;
}

interface DemoData {
  gaze_path: GazeStep[];
  narration: string;
  source: "ai" | "human";
}

interface ExpertDemoProps {
  questionText: string;
  questionId: number;
  source: "practice" | "exam";
  /** 启用语义高亮保留（MultimodalEnhancer 模式） */
  semanticMode?: boolean;
  /** 启用聚光灯效果：非活跃文本变暗 */
  spotlightEnabled?: boolean;
  /** 只显示这些 highlight_type（为空则全部显示） */
  highlightFilter?: string[];
  className?: string;
  onFinish?: () => void;
}





/**
 * 学霸审题演示组件 — 用真同步引擎驱动光标跟随动画。
 *
 * V2 重写：用 useAudioSync 的 rAF + audio.currentTime 替代 setTimeout 假同步。
 * 音频播放驱动视觉动画，而非两条独立时间线。
 *
 * semanticMode=true 时启用语义高亮保留（已访问步骤保留题眼/信号词等标注），
 * 等同于原 MultimodalEnhancer 的功能。
 */
export default function ExpertDemo({
  questionText,
  questionId,
  source,
  semanticMode = false,
  spotlightEnabled,
  highlightFilter,
  className = "",
  onFinish,
}: ExpertDemoProps) {
  const [demoData, setDemoData] = useState<DemoData | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [error, setError] = useState("");
  const [currentStepIdx, setCurrentStepIdx] = useState(-1);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set());
  const [speed, setSpeed] = useState(1);

  const spotlight = spotlightEnabled ?? semanticMode;

  // 加载演示数据
  const loadDemo = useCallback(async () => {
    setLoadingDemo(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/cognitive/demo/${source}/${questionId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setDemoData(data.demo);
    } catch (e: unknown) {
      setError((e as Error).message || "加载演示数据失败");
    } finally {
      setLoadingDemo(false);
    }
  }, [questionId, source]);

  // 构建步骤时间轴（每个步骤的起始时间 ms）
  const stepTimeline = useMemo(() => {
    if (!demoData?.gaze_path) return [];
    return buildStepTimeline(demoData.gaze_path);
  }, [demoData]);

  const stepDurations = useMemo(() => {
    if (!demoData?.gaze_path) return [];
    return demoData.gaze_path.map((s) => s.duration_ms);
  }, [demoData]);

  // 注册 gaze_path 到多时间轴协调器，供外部组件同步
  const timeline = useSyncTimeline();
  useEffect(() => {
    if (!stepTimeline.length || !stepDurations.length) return;
    const events = stepTimeline.map((startMs, i) => ({
      startMs,
      endMs: startMs + stepDurations[i],
      data: demoData?.gaze_path[i],
    }));
    timeline.registerTimeline("gaze", events);
    return () => timeline.unregisterTimeline("gaze");
  }, [stepTimeline, stepDurations, demoData, timeline]);

  // 音频同步引擎 — 用旁白文本驱动 TTS，rAF 每帧回调 onSync
  const narrationText = demoData?.narration || "";
  const sync = useAudioSync({
    text: narrationText,
    speed,
    autoPrepare: !!narrationText,
    onFinish: () => {
      setCurrentStepIdx(-1);
      onFinish?.();
    },
    onSync: (ms) => {
      // 根据音频当前时间找到对应的 gaze_path 步骤
      if (!stepTimeline.length) return;
      const idx = findCurrentStep(ms * speed, stepTimeline, stepDurations);
      if (idx !== currentStepIdx && idx >= 0) {
        setCurrentStepIdx(idx);
        if (semanticMode) {
          setVisitedSteps((prev) => new Set(prev).add(idx));
        }
      }
    },
  });

  // 当前步骤数据
  const step = currentStepIdx >= 0 && demoData ? demoData.gaze_path[currentStepIdx] : null;
  const actionStyle = step ? ACTION_STYLES[step.action] || ACTION_STYLES.focus : null;

  // 在题目文本中高亮当前 target_text（+ 语义模式下保留已访问步骤）
  const renderText = () => {
    if (!demoData?.gaze_path?.length) return <span>{questionText}</span>;

    // 收集需要标注的区域
    type Region = { start: number; end: number; stepIdx: number; isCurrent: boolean };
    const regions: Region[] = [];

    for (let i = 0; i < demoData.gaze_path.length; i++) {
      if (i !== currentStepIdx && !(semanticMode && visitedSteps.has(i))) continue;
      const s = demoData.gaze_path[i];
      if (highlightFilter?.length && s.highlight_type && !highlightFilter.includes(s.highlight_type)) continue;
      let idx = questionText.indexOf(s.target_text);
      if (idx < 0) idx = questionText.toLowerCase().indexOf(s.target_text.toLowerCase());
      if (idx < 0) continue;
      regions.push({ start: idx, end: idx + s.target_text.length, stepIdx: i, isCurrent: i === currentStepIdx });
    }

    regions.sort((a, b) => a.start - b.start);
    // 去重重叠：优先保留 current
    const merged: Region[] = [];
    for (const r of regions) {
      if (merged.length > 0 && r.start < merged[merged.length - 1].end) {
        if (r.isCurrent) merged[merged.length - 1] = r;
        continue;
      }
      merged.push(r);
    }

    const parts: React.ReactNode[] = [];
    let cursor = 0;
    for (const r of merged) {
      if (r.start > cursor) {
        parts.push(<span key={`t-${cursor}`} style={{ color: "var(--color-text-secondary)", opacity: spotlight && currentStepIdx >= 0 ? 0.3 : undefined }}>{questionText.slice(cursor, r.start)}</span>);
      }
      const gs = demoData.gaze_path[r.stepIdx];
      const ht = gs.highlight_type || "normal";
      const semantic = SEMANTIC_STYLES[ht] || SEMANTIC_STYLES.normal;
      const aStyle = r.isCurrent ? (ACTION_STYLES[gs.action] || ACTION_STYLES.focus) : null;

      parts.push(
        <span key={`h-${r.start}`}
          className={`relative inline-block transition-all duration-300 rounded-sm px-0.5 ${r.isCurrent ? "animate-pulse" : ""}`}
          style={{
            background: r.isCurrent ? aStyle?.bg : (semanticMode && ht !== "normal" ? `${semantic.underline}15` : "transparent"),
            border: r.isCurrent ? aStyle?.border : undefined,
            borderBottom: !r.isCurrent && semanticMode && ht !== "normal" ? `2px solid ${semantic.underline}` : undefined,
            color: "var(--color-text)",
            fontWeight: r.isCurrent || ht === "question_eye" ? 600 : 400,
            padding: r.isCurrent ? "1px 4px" : undefined,
          }}>
          {questionText.slice(r.start, r.end)}
          {r.isCurrent && (
            <span className="expert-cursor absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 expert-pulse-dot" />
              <span className="absolute w-5 h-5 rounded-full border-2 border-blue-400 expert-ripple" />
            </span>
          )}
        </span>
      );
      cursor = r.end;
    }
    if (cursor < questionText.length) {
      parts.push(<span key={`t-${cursor}`} style={{ color: "var(--color-text-secondary)", opacity: spotlight && currentStepIdx >= 0 ? 0.3 : undefined }}>{questionText.slice(cursor)}</span>);
    }
    return <>{parts}</>;
  };

  // 未加载状态
  if (!demoData && !loadingDemo) {
    return (
      <div className={className}>
        <button onClick={loadDemo}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium
                     bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600
                     hover:from-blue-100 hover:to-purple-100 transition-all border border-blue-100">
          {semanticMode ? "🎯 多模态审题演示" : "👁 看学霸怎么做"}
        </button>
      </div>
    );
  }

  if (loadingDemo) {
    return (
      <div className={`flex items-center gap-2 p-4 rounded-xl ${className}`}
        style={{ background: "var(--color-surface-hover)" }}>
        <span className="animate-spin text-blue-500">{"⟳"}</span>
        <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>正在生成学霸审题演示...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-3 rounded-xl text-sm ${className}`}
        style={{ background: "rgba(239,68,68,0.06)", color: "#ef4444" }}>
        {error}
        <button onClick={loadDemo} className="ml-2 underline">重试</button>
      </div>
    );
  }

  if (!demoData?.gaze_path?.length) return null;

  return (
    <div className={`rounded-2xl overflow-hidden ${className}`}
      style={{ border: "1px solid var(--color-border)" }}>
      {/* 头部控制栏 */}
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{
          background: semanticMode
            ? "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(59,130,246,0.06), rgba(139,92,246,0.06))"
            : "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.06))",
          borderBottom: "1px solid var(--color-border)",
        }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: "#2563eb" }}>
            {semanticMode ? "🎯 多模态审题" : "👁 学霸审题演示"}
          </span>
          {demoData.source === "human" && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-50 text-green-600">真人标注</span>
          )}
          {sync.playing && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
              音视频同步中
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {[0.5, 1, 1.5, 2].map((s) => (
            <button key={s} onClick={() => setSpeed(s)}
              className={`px-2 py-0.5 rounded text-xs transition-colors ${
                speed === s ? "bg-blue-500 text-white" : "bg-white text-gray-500 hover:bg-gray-100"
              }`}>
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* 题目文本 + 高亮 */}
      <div className="p-4">
        <div className="text-base leading-loose whitespace-pre-wrap mb-4 group">
          {renderText()}
        </div>

        {/* 内心独白气泡 */}
        {step && (
          <div className="flex items-start gap-2 p-3 rounded-xl mb-3"
            style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
            <span className="text-lg shrink-0">💭</span>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: actionStyle?.bg, color: "var(--color-text)" }}>
                  {actionStyle?.label}
                </span>
                {semanticMode && step.highlight_type && step.highlight_type !== "normal" && (
                  <span className="text-xs px-1.5 py-0.5 rounded text-white"
                    style={{ background: (SEMANTIC_STYLES[step.highlight_type] || SEMANTIC_STYLES.normal).badge }}>
                    {(SEMANTIC_STYLES[step.highlight_type] || SEMANTIC_STYLES.normal).label}
                  </span>
                )}
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  步骤 {step.step}/{demoData.gaze_path.length}
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--color-text)" }}>{step.thought}</p>
            </div>
          </div>
        )}

        {/* 进度条 */}
        <div className="h-1 rounded-full mb-1" style={{ background: "var(--color-border)" }}>
          <div className="h-1 rounded-full transition-all duration-300"
            style={{
              width: `${demoData.gaze_path.length > 0 ? ((currentStepIdx + 1) / demoData.gaze_path.length) * 100 : 0}%`,
              background: semanticMode
                ? "linear-gradient(90deg, #dc2626, #3b82f6, #8b5cf6)"
                : "linear-gradient(90deg, #3b82f6, #8b5cf6)",
            }} />
        </div>

        {/* 步骤时间轴 — 可点击跳转 */}
        <div className="flex gap-0.5 mb-3">
          {demoData.gaze_path.map((gs, i) => {
            const aStyle = ACTION_STYLES[gs.action] || ACTION_STYLES.focus;
            const isActive = i === currentStepIdx;
            const isVisited = i < currentStepIdx || visitedSteps.has(i);
            return (
              <button key={i} onClick={() => sync.seekToStep?.(stepTimeline[i])}
                className="flex-1 h-2 rounded-sm transition-all hover:scale-y-150"
                title={`步骤${i + 1}: ${gs.target_text}`}
                style={{
                  background: isActive ? aStyle.bg : isVisited ? "rgba(59,130,246,0.3)" : "var(--color-border)",
                  border: isActive ? aStyle.border : "1px solid transparent",
                  opacity: isActive ? 1 : isVisited ? 0.8 : 0.5,
                }} />
            );
          })}
        </div>

        {/* 播放控制 */}
        <div className="flex items-center gap-3">
          <button
            onClick={sync.playing ? sync.pause : sync.play}
            disabled={!sync.ready}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              sync.playing
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                : "bg-blue-500 text-white hover:bg-blue-600"
            } disabled:opacity-40`}>
            {sync.loading ? "准备中..." : sync.playing ? "\u23f8 暂停" : currentStepIdx > 0 ? "\u25b6 继续" : "\u25b6 开始演示"}
          </button>
          {currentStepIdx > 0 && (
            <button onClick={() => { sync.replay(); setCurrentStepIdx(-1); setVisitedSteps(new Set()); }}
              className="px-3 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors">
              {"\u21bb"} 重播
            </button>
          )}
        </div>

        {/* 语义图例（semanticMode 下显示） */}
        {semanticMode && visitedSteps.size > 0 && (
          <div className="flex flex-wrap gap-3 mt-3 pt-2"
            style={{ borderTop: "1px solid var(--color-border)" }}>
            {Object.entries(SEMANTIC_STYLES)
              .filter(([key]) => key !== "normal" &&
                demoData.gaze_path.some((s, i) => visitedSteps.has(i) && s.highlight_type === key))
              .map(([key, style]) => (
                <span key={key} className="flex items-center gap-1 text-xs"
                  style={{ color: style.badge }}>
                  <span className="inline-block w-3 h-3 rounded-sm"
                    style={{ background: `${style.underline}20`, borderBottom: `2px solid ${style.underline}` }} />
                  {style.label}
                </span>
              ))}
          </div>
        )}

        {/* 旁白文本 */}
        {demoData.narration && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
            <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
              审题旁白
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
              {demoData.narration}
            </p>
          </div>
        )}

        <style jsx>{`
          @keyframes pulse-dot {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.4); opacity: 0.7; }
          }
          @keyframes ripple-ring {
            0% { transform: scale(0.6); opacity: 0.8; }
            100% { transform: scale(1.8); opacity: 0; }
          }
          .expert-pulse-dot { animation: pulse-dot 1.2s ease-in-out infinite; }
          .expert-ripple { animation: ripple-ring 1.5s ease-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .expert-pulse-dot, .expert-ripple { animation: none; }
            .animate-pulse { animation: none; }
          }
        `}</style>
      </div>
    </div>
  );
}
