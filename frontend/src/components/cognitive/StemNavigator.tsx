"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import AudioPlayer from "@/components/cognitive/AudioPlayer";

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

const ROLE_STYLES: Record<string, { bg: string; border: string; label: string; icon: string }> = {
  question: { bg: "rgba(239,68,68,0.12)", border: "2px solid rgba(239,68,68,0.5)", label: "问题", icon: "?" },
  condition: { bg: "rgba(59,130,246,0.1)", border: "2px solid rgba(59,130,246,0.4)", label: "条件", icon: "!" },
  background: { bg: "rgba(156,163,175,0.08)", border: "1px solid rgba(156,163,175,0.3)", label: "背景", icon: "~" },
  noise: { bg: "rgba(156,163,175,0.05)", border: "1px dashed rgba(156,163,175,0.2)", label: "干扰", icon: "x" },
};

const PRIORITY_STYLES: Record<string, { opacity: number; badge: string; badgeBg: string }> = {
  must_read: { opacity: 1, badge: "必读", badgeBg: "#dc2626" },
  skim: { opacity: 0.75, badge: "略读", badgeBg: "#d97706" },
  skip: { opacity: 0.45, badge: "可跳", badgeBg: "#9ca3af" },
};

/** 长题干审题辅助组件 — 自动折叠非关键部分，引导学生按优先级阅读 */
export default function StemNavigator({
  questionText,
  questionType = "",
  options = "",
  className = "",
}: StemNavigatorProps) {
  const [analysis, setAnalysis] = useState<LongStemAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

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
              const isEye = analysis.eye_sentence && seg.text.includes(analysis.eye_sentence);

              return (
                <div key={i}
                  className={`p-3 rounded-xl transition-all ${isSkippable && !expanded ? "cursor-pointer" : ""}`}
                  style={{
                    background: isEye ? "rgba(239,68,68,0.1)" : roleStyle.bg,
                    border: isEye ? "2px solid rgba(239,68,68,0.5)" : roleStyle.border,
                    opacity: isSkippable && !expanded ? 0.5 : prioStyle.opacity,
                  }}
                  onClick={() => isSkippable && !expanded && setExpanded(true)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-1.5 py-0.5 rounded text-white" style={{ background: prioStyle.badgeBg }}>
                      {prioStyle.badge}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{roleStyle.label}</span>
                    {isEye && <span className="text-xs px-1.5 py-0.5 rounded text-white" style={{ background: "#dc2626" }}>&#x1F441; 题眼</span>}
                  </div>
                  {isSkippable && !expanded ? (
                    <p className="text-xs italic" style={{ color: "var(--color-text-secondary)" }}>
                      [背景信息，点击展开] {seg.text.slice(0, 30)}...
                    </p>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
                      {seg.text}
                    </p>
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
    </div>
  );
}
