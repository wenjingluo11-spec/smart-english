"use client";

import { useState, useMemo } from "react";
import AudioPlayer from "@/components/cognitive/AudioPlayer";

interface ContextClue {
  text: string;
  position: "before" | "after";
  clue_type: string;
  hint: string;
}

interface BlankAnalysis {
  blank_index: number;
  context_clues: ContextClue[];
  blank_type: string;
  strategy: string;
}

interface ClozeAnalysis {
  blanks: BlankAnalysis[];
  overview_strategy: string;
  passage_keywords: string[];
  difficulty_blanks: number[];
  solving_order: string;
}

interface ClozePassageReaderProps {
  passageText: string;
  questions: { id: number; content: string; options: string[] }[];
  analysis: ClozeAnalysis | null;
  analysisLoading?: boolean;
  /** 当前聚焦的空格序号 */
  activeBlank?: number | null;
  onBlankClick?: (index: number) => void;
  className?: string;
}

const CLUE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  collocation: { bg: "rgba(239,68,68,0.12)", text: "#dc2626", label: "搭配" },
  logic: { bg: "rgba(168,85,247,0.12)", text: "#9333ea", label: "逻辑" },
  grammar: { bg: "rgba(34,197,94,0.12)", text: "#16a34a", label: "语法" },
  synonym: { bg: "rgba(59,130,246,0.1)", text: "#2563eb", label: "近义" },
  antonym: { bg: "rgba(245,158,11,0.15)", text: "#d97706", label: "反义" },
  context: { bg: "rgba(20,184,166,0.12)", text: "#0d9488", label: "语境" },
};

const BLANK_TYPE_LABELS: Record<string, string> = {
  vocabulary: "词汇", grammar: "语法", logic: "逻辑",
  collocation: "搭配", phrase: "短语",
};

/**
 * 完形填空认知增强阅读组件 — 语境高亮 + 线索词标注 + 学霸策略。
 *
 * 功能：
 * - 文章中的空格位置可视化标记
 * - 点击空格显示该空的线索词高亮
 * - 线索词 hover 显示提示
 * - 学霸策略面板（通读大意 + 做题顺序 + 难点标记）
 * - 关键词标注模式
 */
export default function ClozePassageReader({
  passageText,
  questions,
  analysis,
  analysisLoading = false,
  activeBlank,
  onBlankClick,
  className = "",
}: ClozePassageReaderProps) {
  const [showStrategy, setShowStrategy] = useState(false);
  const [showClues, setShowClues] = useState(true);

  // 当前空格的分析数据
  const activeAnalysis = useMemo(() => {
    if (activeBlank === null || activeBlank === undefined || !analysis) return null;
    return analysis.blanks.find((b) => b.blank_index === activeBlank) || null;
  }, [activeBlank, analysis]);

  // 当前空格的线索词集合
  const activeClueTexts = useMemo(() => {
    if (!activeAnalysis || !showClues) return new Set<string>();
    return new Set(activeAnalysis.context_clues.map((c) => c.text.toLowerCase()));
  }, [activeAnalysis, showClues]);

  // 关键词集合
  const keywordSet = useMemo(() => {
    if (!analysis) return new Set<string>();
    return new Set(analysis.passage_keywords.map((k) => k.toLowerCase()));
  }, [analysis]);

  return (
    <div className={className}>
      {/* 学霸策略面板 */}
      {analysis && (
        <div className="mb-4">
          <button
            onClick={() => setShowStrategy(!showStrategy)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: showStrategy ? "var(--color-primary)" : "var(--color-surface-hover)",
              color: showStrategy ? "#fff" : "var(--color-text-secondary)",
            }}
          >
            <BrainIcon />
            学霸做完形策略
            <span className="ml-1">{showStrategy ? "▲" : "▼"}</span>
          </button>

          {showStrategy && (
            <div className="mt-2 p-4 rounded-xl text-sm space-y-3 animate-slide-up"
              style={{ background: "var(--color-surface-hover)" }}>
              {/* 通读大意 */}
              {analysis.overview_strategy && (
                <div>
                  <span className="text-xs font-medium" style={{ color: "var(--color-primary)" }}>
                    第一步：通读全文把握大意
                  </span>
                  <p className="mt-1" style={{ color: "var(--color-text)" }}>{analysis.overview_strategy}</p>
                </div>
              )}

              {/* 关键词 */}
              {analysis.passage_keywords.length > 0 && (
                <div>
                  <span className="text-xs font-medium" style={{ color: "#d97706" }}>文章关键词</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {analysis.passage_keywords.map((kw, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(245,158,11,0.15)", color: "#d97706" }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 做题顺序 */}
              {analysis.solving_order && (
                <div>
                  <span className="text-xs font-medium" style={{ color: "#16a34a" }}>第二步：做题顺序</span>
                  <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>{analysis.solving_order}</p>
                </div>
              )}

              {/* 难点标记 */}
              {analysis.difficulty_blanks.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: "#dc2626" }}>较难的空</span>
                  <div className="flex gap-1">
                    {analysis.difficulty_blanks.map((idx) => (
                      <span key={idx} className="text-xs w-5 h-5 rounded-full flex items-center justify-center text-white"
                        style={{ background: "#ef4444" }}>
                        {idx + 1}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 控制栏 */}
      <div className="flex items-center gap-2 mb-3">
        <AudioPlayer text={passageText} compact label="朗读全文" />
        {analysis && (
          <button
            onClick={() => setShowClues(!showClues)}
            className="text-xs px-2.5 py-1 rounded-lg transition-all"
            style={{
              background: showClues ? "rgba(59,130,246,0.1)" : "var(--color-surface-hover)",
              color: showClues ? "#3b82f6" : "var(--color-text-secondary)",
            }}
          >
            {showClues ? "隐藏线索" : "显示线索"}
          </button>
        )}
        {analysisLoading && (
          <span className="text-xs flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
            <span className="animate-spin">⟳</span> 分析中...
          </span>
        )}
      </div>

      {/* 文章渲染 */}
      <div className="text-sm leading-loose whitespace-pre-wrap p-4 rounded-xl"
        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
        <PassageRenderer
          text={passageText}
          activeBlank={activeBlank ?? null}
          activeClueTexts={activeClueTexts}
          keywordSet={keywordSet}
          showClues={showClues}
          difficultyBlanks={analysis?.difficulty_blanks || []}
          clueDetails={activeAnalysis?.context_clues || []}
          onBlankClick={onBlankClick}
        />
      </div>

      {/* 当前空格分析卡片 */}
      {activeAnalysis && (
        <div className="mt-3 p-3 rounded-xl animate-slide-up"
          style={{ background: "var(--color-surface-hover)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-medium px-1.5 py-0.5 rounded text-white"
              style={{ background: "var(--color-primary)" }}>
              #{(activeAnalysis.blank_index) + 1}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>
              {BLANK_TYPE_LABELS[activeAnalysis.blank_type] || activeAnalysis.blank_type}
            </span>
          </div>
          <p className="text-sm mb-2" style={{ color: "var(--color-text)" }}>
            {activeAnalysis.strategy}
          </p>
          {activeAnalysis.context_clues.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>线索词：</span>
              {activeAnalysis.context_clues.map((clue, i) => {
                const color = CLUE_COLORS[clue.clue_type] || CLUE_COLORS.context;
                return (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="px-1.5 py-0.5 rounded" style={{ background: color.bg, color: color.text }}>
                      {clue.text}
                    </span>
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      ({color.label}) {clue.hint}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 线索类型图例 */}
      {showClues && analysis && (
        <div className="flex flex-wrap gap-2 mt-3 pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
          {Object.entries(CLUE_COLORS).map(([type, style]) => (
            <span key={type} className="flex items-center gap-1 text-xs" style={{ color: style.text }}>
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: style.bg }} />
              {style.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** 文章渲染器 — 识别空格标记并渲染为可点击的标记 */
function PassageRenderer({
  text,
  activeBlank,
  activeClueTexts,
  keywordSet,
  showClues,
  difficultyBlanks,
  clueDetails,
  onBlankClick,
}: {
  text: string;
  activeBlank: number | null;
  activeClueTexts: Set<string>;
  keywordSet: Set<string>;
  showClues: boolean;
  difficultyBlanks: number[];
  clueDetails: ContextClue[];
  onBlankClick?: (index: number) => void;
}) {
  // 找到所有空格标记 (___) 或 (1)___ 或 blank 标记
  const segments = useMemo(() => {
    const blankPattern = /(?:_{3,}|\(\s*\d+\s*\)\s*_{2,}|\[\s*\d+\s*\])/g;
    const result: { text: string; isBlank: boolean; blankIndex: number }[] = [];
    let cursor = 0;
    let blankCount = 0;
    let match;

    while ((match = blankPattern.exec(text)) !== null) {
      if (match.index > cursor) {
        result.push({ text: text.slice(cursor, match.index), isBlank: false, blankIndex: -1 });
      }
      result.push({ text: match[0], isBlank: true, blankIndex: blankCount++ });
      cursor = match.index + match[0].length;
    }

    if (cursor < text.length) {
      result.push({ text: text.slice(cursor), isBlank: false, blankIndex: -1 });
    }

    // 如果没找到空格标记，返回原文
    if (blankCount === 0) {
      return [{ text, isBlank: false, blankIndex: -1 }];
    }

    return result;
  }, [text]);

  // 为非空格文本段做线索词高亮
  const renderTextWithClues = (segText: string) => {
    if (!showClues || activeClueTexts.size === 0) {
      // 只做关键词高亮
      return highlightKeywords(segText, keywordSet);
    }

    // 同时高亮线索词和关键词
    return highlightCluesAndKeywords(segText, activeClueTexts, keywordSet, clueDetails);
  };

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.isBlank) {
          const isActive = activeBlank === seg.blankIndex;
          const isDifficult = difficultyBlanks.includes(seg.blankIndex);
          return (
            <span
              key={i}
              onClick={() => onBlankClick?.(seg.blankIndex)}
              className="inline-flex items-center justify-center mx-1 px-2 py-0.5 rounded-md cursor-pointer transition-all"
              style={{
                background: isActive ? "var(--color-primary)" : isDifficult ? "rgba(239,68,68,0.12)" : "rgba(59,130,246,0.08)",
                color: isActive ? "#fff" : isDifficult ? "#dc2626" : "var(--color-primary)",
                border: isActive ? "2px solid var(--color-primary)" : isDifficult ? "1px dashed #ef4444" : "1px solid rgba(59,130,246,0.3)",
                fontWeight: 600,
                fontSize: "0.85em",
                minWidth: "2rem",
              }}
              title={isDifficult ? `第${seg.blankIndex + 1}空 (较难)` : `第${seg.blankIndex + 1}空`}
            >
              {seg.blankIndex + 1}
            </span>
          );
        }
        return <span key={i}>{renderTextWithClues(seg.text)}</span>;
      })}
    </>
  );
}

/** 高亮关键词 */
function highlightKeywords(text: string, keywordSet: Set<string>) {
  if (keywordSet.size === 0) return text;

  const words = Array.from(keywordSet);
  const pattern = new RegExp(`(${words.map(escapeRegex).join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    if (keywordSet.has(part.toLowerCase())) {
      return (
        <span key={i} className="px-0.5 rounded-sm" style={{ background: "rgba(245,158,11,0.12)", color: "#d97706" }}>
          {part}
        </span>
      );
    }
    return part;
  });
}

/** 同时高亮线索词和关键词 */
function highlightCluesAndKeywords(
  text: string,
  clueTexts: Set<string>,
  keywordSet: Set<string>,
  clueDetails: ContextClue[],
) {
  const allTerms = new Set([...clueTexts, ...keywordSet]);
  if (allTerms.size === 0) return text;

  const words = Array.from(allTerms);
  const pattern = new RegExp(`(${words.map(escapeRegex).join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const lower = part.toLowerCase();
    if (clueTexts.has(lower)) {
      const detail = clueDetails.find((c) => c.text.toLowerCase() === lower);
      const clueColor = detail ? (CLUE_COLORS[detail.clue_type] || CLUE_COLORS.context) : CLUE_COLORS.context;
      return (
        <span key={i} className="relative inline-block group cursor-help px-0.5 rounded-sm"
          style={{ background: clueColor.bg, color: clueColor.text, textDecoration: `underline ${clueColor.text}`, textUnderlineOffset: "3px" }}>
          {part}
          {detail && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded text-xs bg-gray-800 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {detail.hint}
            </span>
          )}
        </span>
      );
    }
    if (keywordSet.has(lower)) {
      return (
        <span key={i} className="px-0.5 rounded-sm" style={{ background: "rgba(245,158,11,0.12)", color: "#d97706" }}>
          {part}
        </span>
      );
    }
    return part;
  });
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function BrainIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 0-7 7c0 3 2 5.5 4 7.5L12 22l3-5.5c2-2 4-4.5 4-7.5a7 7 0 0 0-7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}
