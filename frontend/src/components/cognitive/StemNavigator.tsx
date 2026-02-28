"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import AudioPlayer from "@/components/cognitive/AudioPlayer";
import { STEM_ROLE_STYLES, STEM_PRIORITY_STYLES } from "@/lib/cognitive-styles";

interface StemSegment {
  text: string;
  role: "background" | "condition" | "question" | "noise";
  priority: "must_read" | "skim" | "skip";
}

interface LongStemAnalysis {
  stem_structure: StemSegment[];
  eye_sentence: string;
  reading_path: string;
  time_estimate_seconds: number;
  tip: string;
}

interface StemNavigatorProps {
  /** 题目原文 */
  questionText: string;
  /** 题型 */
  questionType?: string;
  /** 选项文本 */
  options?: string;
  className?: string;
}

const ROLE_STYLES = STEM_ROLE_STYLES;
const PRIORITY_STYLES = STEM_PRIORITY_STYLES;

/** 长题干审题辅助组件 — 自动折叠非关键部分，引导学生按优先级阅读 */
export default function StemNavigator({
  questionText,
  questionType = "",
  options = "",
  className = "",
}: StemNavigatorProps) {
  const [analysis, setAnalysis] = useState<LongStemAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set());
  const [showGuide, setShowGuide] = useState(true);
  const eyeRef = useRef<HTMLDivElement>(null);

  const analyze = useCallback(async () => {
    if (questionText.length < 100) return;
    setLoading(true);
    try {
      const result = await api.post<LongStemAnalysis>("/cognitive/long-stem/analyze", {
        question_content: questionText,
        question_type: questionType,
        options,
      });
      setAnalysis(result);
    } catch {
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, [questionText, questionType, options]);

  useEffect(() => {
    analyze();
  }, [analyze]);

  // 题干不够长，不需要辅助
  if (questionText.length < 100) return null;

  if (loading) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-xl ${className}`} style={{ background: "var(--color-surface-hover)" }}>
        <span className="animate-spin text-sm">&#x27F3;</span>
        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>AI 正在分析题干结构...</span>
      </div>
    );
  }

  if (!analysis || !analysis.stem_structure.length) return null;

  // 找到题眼在原文中的位置
  const eyeIdx = analysis.eye_sentence ? questionText.indexOf(analysis.eye_sentence) : -1;

  return (
    <div className={`rounded-2xl overflow-hidden ${className}`} style={{ border: "1px solid var(--color-border)" }}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.06), rgba(59,130,246,0.06))", borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: "#dc2626" }}>&#x1F50D; 长题干导航</span>
          {analysis.time_estimate_seconds > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(59,130,246,0.1)", color: "#2563eb" }}>
              建议审题 {analysis.time_estimate_seconds}s
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {showGuide && analysis.eye_sentence && (
            <button onClick={() => eyeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="text-xs px-2 py-1 rounded-lg transition-colors"
              style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>
              定位题眼
            </button>
          )}
          <button onClick={() => setShowGuide(!showGuide)}
            className="text-xs px-2 py-1 rounded-lg transition-colors"
            style={{ background: showGuide ? "var(--color-primary)" : "var(--color-surface-hover)", color: showGuide ? "white" : "var(--color-text-secondary)" }}>
            {showGuide ? "显示导航" : "显示原文"}
          </button>
          <AudioPlayer text={questionText} compact label="听题" />
        </div>
      </div>

      <div className="p-4">
        {/* 审题建议 */}
        {analysis.reading_path && (
          <div className="p-3 rounded-xl mb-3 text-sm"
            style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
            <span className="text-xs font-semibold" style={{ color: "#2563eb" }}>&#x1F4A1; 审题路径：</span>
            <span className="ml-1" style={{ color: "var(--color-text)" }}>{analysis.reading_path}</span>
          </div>
        )}

        {showGuide ? (
          /* 导航模式：按结构分段展示 */
          <div className="space-y-2">
            {analysis.stem_structure.map((seg, i) => {
              const roleStyle = ROLE_STYLES[seg.role] || ROLE_STYLES.background;
              const prioStyle = PRIORITY_STYLES[seg.priority] || PRIORITY_STYLES.skim;
              const isSkippable = seg.priority === "skip";
              const segExpanded = expandedSegments.has(i);
              const isEye = analysis.eye_sentence && seg.text.includes(analysis.eye_sentence);

              return (
                <div key={i}
                  ref={isEye ? eyeRef : undefined}
                  className={`p-3 rounded-xl transition-all ${isSkippable && !segExpanded ? "cursor-pointer" : ""}`}
                  style={{
                    background: isEye ? "rgba(239,68,68,0.1)" : roleStyle.bg,
                    border: isEye ? "2px solid rgba(239,68,68,0.5)" : roleStyle.border,
                    opacity: isSkippable && !segExpanded ? 0.5 : prioStyle.opacity,
                  }}
                  onClick={() => isSkippable && !segExpanded && setExpandedSegments(prev => new Set(prev).add(i))}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-1.5 py-0.5 rounded text-white" style={{ background: prioStyle.badgeBg }}>
                      {prioStyle.badge}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{roleStyle.label}</span>
                    {isEye && <span className="text-xs px-1.5 py-0.5 rounded text-white" style={{ background: "#dc2626" }}>&#x1F441; 题眼</span>}
                  </div>
                  {isSkippable && !segExpanded ? (
                    <p className="text-xs italic" style={{ color: "var(--color-text-secondary)" }}>
                      [背景信息，点击展开] {seg.text.slice(0, 30)}...
                    </p>
                  ) : (
                    <div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
                        {seg.text}
                      </p>
                      <div className="mt-1.5">
                        <AudioPlayer text={seg.text} compact label="听这段" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* 原文模式：在原文上标注题眼 */
          <div className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
            {eyeIdx >= 0 ? (
              <>
                <span style={{ color: "var(--color-text-secondary)" }}>{questionText.slice(0, eyeIdx)}</span>
                <span className="px-1 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.5)", fontWeight: 600 }}>
                  {analysis.eye_sentence}
                </span>
                <span style={{ color: "var(--color-text-secondary)" }}>{questionText.slice(eyeIdx + analysis.eye_sentence.length)}</span>
              </>
            ) : (
              questionText
            )}
          </div>
        )}

        {/* 审题小贴士 */}
        {analysis.tip && (
          <div className="mt-3 pt-3 text-xs" style={{ borderTop: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
            &#x1F4DD; {analysis.tip}
          </div>
        )}

        {/* 图例 */}
        {showGuide && (
          <div className="flex flex-wrap gap-3 mt-3 pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
            {Object.entries(ROLE_STYLES).map(([key, style]) => (
              <span key={key} className="flex items-center gap-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: style.bg, border: style.border }} />
                {style.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <style jsx>{`
        @media (prefers-reduced-motion: reduce) {
          div { transition: none !important; }
        }
      `}</style>
    </div>
  );
}
