"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import TextHighlighter, { type Highlight } from "@/components/cognitive/TextHighlighter";
import AudioPlayer from "@/components/cognitive/AudioPlayer";
import StemNavigator from "@/components/cognitive/StemNavigator";
import ExpertDemo from "@/components/cognitive/ExpertDemo";
import { useEnhancementConfig } from "@/hooks/use-enhancement-config";

interface AnalysisData {
  question_eye?: string;
  key_phrases?: { text: string; role: string; start?: number; end?: number; importance?: string; hint?: string }[];
  reading_order?: { step: number; target: string; action: string; reason: string }[];
  strategy?: string;
  distractors?: { option: string; trap: string }[];
}

interface PreAnswerGuideProps {
  /** 题目ID */
  questionId: number;
  /** 题目原文 */
  questionText: string;
  /** 题目选项文本（用于长题干分析） */
  optionsText?: string;
  /** 题目类型 */
  questionType?: string;
  /** 来源：practice 或 exam */
  source?: "practice" | "exam";
  /** 关闭引导的回调 */
  onClose: () => void;
  /** 紧凑模式 */
  compact?: boolean;
  className?: string;
}

type GuidePhase = "overview" | "reading_order" | "expert_demo";

/**
 * 答题前审题引导组件 — 在学生作答之前，引导他们学会审题。
 *
 * 三步引导流程：
 * 1. 题眼总览：高亮题眼和关键词，展示审题策略
 * 2. 审题顺序：逐步展示学霸的审题路径
 * 3. 学霸演示：完整的光标跟随审题动画（可选）
 *
 * 核心原则：只教审题方法，不给答案。
 */
export default function PreAnswerGuide({
  questionId,
  questionText,
  optionsText = "",
  questionType = "",
  source = "exam",
  onClose,
  compact = false,
  className = "",
}: PreAnswerGuideProps) {
  const { config } = useEnhancementConfig();
  const [phase, setPhase] = useState<GuidePhase>("overview");
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showExpertDemo, setShowExpertDemo] = useState(false);
  const [flashTarget, setFlashTarget] = useState<string | null>(null);
  const questionTextRef = useRef<HTMLDivElement>(null);

  // 加载题眼分析数据
  useEffect(() => {
    setLoading(true);
    api.get<{ analysis: AnalysisData }>(`/cognitive/analysis/${source}/${questionId}`)
      .then((res) => setAnalysis(res.analysis))
      .catch(() => setAnalysis(null))
      .finally(() => setLoading(false));
  }, [questionId, source]);

  // 构建高亮数据
  const highlights: Highlight[] = [];
  if (analysis) {
    if (analysis.question_eye) {
      const idx = questionText.indexOf(analysis.question_eye);
      highlights.push({
        text: analysis.question_eye,
        start: idx >= 0 ? idx : 0,
        end: idx >= 0 ? idx + analysis.question_eye.length : analysis.question_eye.length,
        type: "question_eye",
        label: "题眼",
      });
    }
    if (analysis.key_phrases) {
      for (const kp of analysis.key_phrases) {
        const idx = questionText.indexOf(kp.text);
        const type = kp.role === "signal_word" ? "signal_word"
          : kp.role === "context_clue" ? "clue"
          : kp.role === "key_info" ? "key_phrase"
          : "key_phrase";
        highlights.push({
          text: kp.text,
          start: kp.start ?? (idx >= 0 ? idx : 0),
          end: kp.end ?? (idx >= 0 ? idx + kp.text.length : kp.text.length),
          type: type as Highlight["type"],
          label: kp.hint || kp.role,
        });
      }
    }
  }

  const isLongStem = questionText.length >= 100;

  // Step↔text linkage: scroll to and flash-highlight target text
  const handleStepClick = useCallback((target: string) => {
    setFlashTarget(target);
    if (questionTextRef.current) {
      questionTextRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => setFlashTarget(null), 1200);
  }, []);

  if (loading) {
    return (
      <div className={`p-4 rounded-2xl ${className}`} style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-2">
          <div className="animate-spin w-4 h-4 border-2 rounded-full" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>正在分析题目...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: "var(--color-card)", border: "2px solid var(--color-primary)" }}>

      {/* 顶部标签 */}
      <div className="flex items-center justify-between px-4 py-2"
        style={{ background: "var(--color-primary)", color: "white" }}>
        <div className="flex items-center gap-2">
          <span className="text-sm">🧠</span>
          <span className="text-sm font-medium">审题引导</span>
          <span className="text-xs opacity-80">
            {phase === "overview" ? "第1步：找题眼" : phase === "reading_order" ? "第2步：审题顺序" : "第3步：学霸演示"}
          </span>
        </div>
        <button onClick={onClose} className="text-xs px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors">
          我会了，开始答题
        </button>
      </div>

      <div className={`${compact ? "p-3" : "p-4"} space-y-3`}>

        {/* Phase 1: 题眼总览 */}
        {phase === "overview" && (
          <div className="space-y-3">
            {/* TTS 朗读 */}
            <div className="flex items-center gap-2">
              <AudioPlayer text={questionText} compact label="先听一遍题目" />
              {analysis?.strategy && (
                <span className="text-xs px-2 py-1 rounded-full"
                  style={{ background: "rgba(59,130,246,0.1)", color: "#2563eb" }}>
                  💡 {analysis.strategy}
                </span>
              )}
            </div>

            {/* 高亮题目文本 */}
            <div className="p-3 rounded-xl" style={{ background: "var(--color-bg)" }}>
              {highlights.length > 0 ? (
                <TextHighlighter text={questionText} highlights={highlights} sequentialReveal />
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
                  {questionText}
                </p>
              )}
            </div>

            {/* 长题干导航 */}
            {isLongStem && (
              <StemNavigator
                questionText={questionText}
                questionType={questionType}
                options={optionsText}
              />
            )}

            {/* 干扰项提醒 */}
            {analysis?.distractors && analysis.distractors.length > 0 && (
              <div className="p-3 rounded-xl text-sm"
                style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                <span className="text-xs font-semibold" style={{ color: "#d97706" }}>⚠️ 注意这些选项可能是陷阱：</span>
                <div className="mt-1 space-y-1">
                  {analysis.distractors.map((d, i) => (
                    <div key={i} className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      <span className="font-medium">{d.option}</span> — {d.trap}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 导航按钮 */}
            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>
                直接答题
              </button>
              {analysis?.reading_order && analysis.reading_order.length > 0 && (
                <button onClick={() => setPhase("reading_order")}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
                  style={{ background: "var(--color-primary)" }}>
                  看审题顺序 {"\u2192"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Phase 2: 审题顺序 */}
        {phase === "reading_order" && analysis?.reading_order && (
          <div className="space-y-3">
            {/* 题目文本（带 flash 高亮） */}
            <div ref={questionTextRef} className="p-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap"
              style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
              {flashTarget ? questionText.split(flashTarget).reduce<React.ReactNode[]>((acc, part, i, arr) => {
                if (i > 0) acc.push(<mark key={`m-${i}`} className="guide-flash-mark" style={{ background: "rgba(59,130,246,0.3)", borderRadius: "2px", padding: "0 2px" }}>{flashTarget}</mark>);
                acc.push(<span key={`t-${i}`}>{part}</span>);
                return acc;
              }, []) : questionText}
            </div>

            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              学霸按这个顺序审题，点击步骤定位原文：
            </p>

            <div className="space-y-2">
              {analysis.reading_order.map((step) => (
                <div key={step.step}
                  onClick={() => handleStepClick(step.target)}
                  className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:ring-2 hover:ring-blue-200 transition-all"
                  style={{ background: "var(--color-bg)" }}>
                  <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
                    {step.step}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{step.target}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.1)", color: "#2563eb" }}>
                        {step.action}
                      </span>
                    </div>
                    {step.reason && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{step.reason}</p>
                    )}
                  </div>
                  <AudioPlayer text={`${step.target}，${step.action}`} compact />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setPhase("overview")}
                className="py-2.5 px-4 rounded-xl text-sm"
                style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
                {"\u2190"} 返回
              </button>
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>
                开始答题
              </button>
              <button onClick={() => setShowExpertDemo(true)}
                className="py-2.5 px-4 rounded-xl text-sm font-medium text-white"
                style={{ background: "var(--color-primary)" }}>
                👀 看学霸演示
              </button>
            </div>

            {showExpertDemo && (
              <ExpertDemo questionText={questionText} questionId={questionId} source={source} />
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .guide-flash-mark {
          animation: flash-highlight 1.2s ease-out;
        }
        @keyframes flash-highlight {
          0%, 30% { background: rgba(59,130,246,0.5); }
          100% { background: rgba(59,130,246,0.1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .guide-flash-mark { animation: none; }
        }
      `}</style>
    </div>
  );
}
