"use client";

import { useState, useCallback, useMemo } from "react";
import SyncReader from "@/components/cognitive/SyncReader";
import AudioPlayer from "@/components/cognitive/AudioPlayer";

interface ParagraphAnalysis {
  index: number;
  start_char: number;
  end_char: number;
  topic_sentence: string;
  key_words: { text: string; type: "topic" | "transition" | "detail" }[];
  difficulty: number;
  purpose: string;
  summary_zh: string;
}

interface ImmersiveReaderProps {
  content: string;
  paragraphs: ParagraphAnalysis[];
  structureType?: string;
  summary?: string;
  fontSize?: number;
  /** 点击段落回调（用于题文关联定位） */
  onParagraphClick?: (index: number) => void;
  /** 高亮的段落索引（题文关联时高亮） */
  highlightedParagraph?: number | null;
  className?: string;
}

const PURPOSE_LABELS: Record<string, string> = {
  introduction: "引入",
  development: "展开",
  transition: "过渡",
  conclusion: "总结",
  example: "举例",
};

const STRUCTURE_LABELS: Record<string, string> = {
  chronological: "时间顺序",
  compare_contrast: "对比结构",
  cause_effect: "因果关系",
  problem_solution: "问题-解决",
  general_to_specific: "总分结构",
};

const KEYWORD_COLORS: Record<string, { bg: string; text: string }> = {
  topic: { bg: "rgba(239,68,68,0.12)", text: "#dc2626" },
  transition: { bg: "rgba(245,158,11,0.15)", text: "#d97706" },
  detail: { bg: "rgba(59,130,246,0.1)", text: "#2563eb" },
};

const DIFFICULTY_COLORS = ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"];

/**
 * 沉浸式阅读组件 — 分段朗读 + 逐词高亮 + 段落分析面板。
 *
 * 每个段落可独立：
 * - TTS 朗读（SyncReader 卡拉OK模式）
 * - 查看段落分析（主题句、关键词、难度、作用）
 * - 关键词高亮标注
 */
export default function ImmersiveReader({
  content,
  paragraphs,
  structureType,
  summary,
  fontSize = 14,
  onParagraphClick,
  highlightedParagraph,
  className = "",
}: ImmersiveReaderProps) {
  const [activeParagraph, setActiveParagraph] = useState<number | null>(null);
  const [readingMode, setReadingMode] = useState<"normal" | "sync" | "keywords">("normal");
  const [showStructure, setShowStructure] = useState(false);

  // 将文章按段落拆分
  const textParagraphs = useMemo(() => {
    const raw = content.split(/\n\s*\n|\n/);
    return raw.filter((p) => p.trim().length > 0);
  }, [content]);

  // 匹配分析数据到文本段落
  const matchedParagraphs = useMemo(() => {
    return textParagraphs.map((text, i) => {
      const analysis = paragraphs.find((p) => p.index === i) || paragraphs[i] || null;
      return { text: text.trim(), analysis };
    });
  }, [textParagraphs, paragraphs]);

  const toggleParagraphPanel = useCallback((index: number) => {
    setActiveParagraph((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div className={className}>
      {/* 文章结构概览 */}
      {(structureType || summary) && (
        <div className="mb-4">
          <button
            onClick={() => setShowStructure(!showStructure)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: showStructure ? "var(--color-primary)" : "var(--color-surface-hover)",
              color: showStructure ? "#fff" : "var(--color-text-secondary)",
            }}
          >
            <StructureIcon />
            文章结构
            <span className="ml-1">{showStructure ? "▲" : "▼"}</span>
          </button>

          {showStructure && (
            <div
              className="mt-2 p-4 rounded-xl text-sm animate-slide-up"
              style={{ background: "var(--color-surface-hover)" }}
            >
              {structureType && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                    style={{ background: "var(--color-primary)" }}>
                    {STRUCTURE_LABELS[structureType] || structureType}
                  </span>
                </div>
              )}
              {summary && (
                <p style={{ color: "var(--color-text-secondary)" }}>{summary}</p>
              )}
              {/* 段落结构缩略图 */}
              <div className="flex gap-1 mt-3">
                {matchedParagraphs.map((p, i) => (
                  <div
                    key={i}
                    className="flex-1 h-2 rounded-full cursor-pointer transition-all hover:h-3"
                    style={{
                      background: p.analysis
                        ? DIFFICULTY_COLORS[(p.analysis.difficulty || 1) - 1]
                        : "var(--color-border)",
                    }}
                    title={p.analysis ? `P${i + 1}: ${p.analysis.summary_zh}` : `段落 ${i + 1}`}
                    onClick={() => onParagraphClick?.(i)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 阅读模式切换 */}
      <div className="flex gap-1.5 mb-4">
        {([
          { key: "normal", label: "普通阅读" },
          { key: "sync", label: "跟读模式" },
          { key: "keywords", label: "关键词标注" },
        ] as const).map((mode) => (
          <button
            key={mode.key}
            onClick={() => setReadingMode(mode.key)}
            className="text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: readingMode === mode.key ? "var(--color-primary)" : "var(--color-surface-hover)",
              color: readingMode === mode.key ? "#fff" : "var(--color-text-secondary)",
            }}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {/* 段落列表 */}
      <div className="space-y-1">
        {matchedParagraphs.map((para, i) => {
          const isHighlighted = highlightedParagraph === i;
          const isActive = activeParagraph === i;
          const analysis = para.analysis;

          return (
            <div
              key={i}
              id={`paragraph-${i}`}
              className={`relative rounded-xl transition-all duration-300 ${
                isHighlighted ? "ring-2 ring-blue-400 shadow-theme-md" : ""
              }`}
              style={{
                background: isHighlighted
                  ? "rgba(59,130,246,0.06)"
                  : isActive
                  ? "var(--color-surface-hover)"
                  : "transparent",
              }}
            >
              {/* 段落序号标记 */}
              <div className="flex items-start gap-3 p-3">
                <button
                  onClick={() => toggleParagraphPanel(i)}
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all mt-0.5"
                  style={{
                    background: isActive ? "var(--color-primary)" : "var(--color-surface-hover)",
                    color: isActive ? "#fff" : "var(--color-text-secondary)",
                  }}
                  title="查看段落分析"
                >
                  {i + 1}
                </button>

                <div className="flex-1 min-w-0">
                  {/* 段落文本 */}
                  {readingMode === "sync" ? (
                    <SyncReader text={para.text} className="mb-1" />
                  ) : readingMode === "keywords" && analysis ? (
                    <KeywordHighlightedText
                      text={para.text}
                      keywords={analysis.key_words}
                      fontSize={fontSize}
                    />
                  ) : (
                    <p
                      className="whitespace-pre-wrap"
                      style={{
                        fontSize: `${fontSize}px`,
                        lineHeight: 1.8,
                        color: "var(--color-text)",
                      }}
                    >
                      {para.text}
                    </p>
                  )}

                  {/* 段落工具栏 */}
                  {readingMode === "normal" && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <AudioPlayer text={para.text} compact label="朗读" />
                      {analysis && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            background: "var(--color-surface-hover)",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {PURPOSE_LABELS[analysis.purpose] || analysis.purpose}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 难度指示器 */}
                {analysis && (
                  <div className="shrink-0 flex flex-col items-center gap-0.5" title={`难度 ${analysis.difficulty}/5`}>
                    {[1, 2, 3, 4, 5].map((d) => (
                      <div
                        key={d}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: d <= analysis.difficulty
                            ? DIFFICULTY_COLORS[analysis.difficulty - 1]
                            : "var(--color-border)",
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 段落分析面板 */}
              {isActive && analysis && (
                <div
                  className="mx-3 mb-3 p-3 rounded-lg text-sm animate-slide-up"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  {/* 主题句 */}
                  {analysis.topic_sentence && (
                    <div className="mb-2">
                      <span className="text-xs font-medium" style={{ color: "var(--color-primary)" }}>
                        主题句
                      </span>
                      <p className="text-sm italic mt-0.5" style={{ color: "var(--color-text)" }}>
                        &ldquo;{analysis.topic_sentence}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* 中文概要 */}
                  <div className="mb-2">
                    <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                      段落大意
                    </span>
                    <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                      {analysis.summary_zh}
                    </p>
                  </div>

                  {/* 关键词 */}
                  {analysis.key_words.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {analysis.key_words.map((kw, ki) => {
                        const color = KEYWORD_COLORS[kw.type] || KEYWORD_COLORS.detail;
                        return (
                          <span
                            key={ki}
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: color.bg, color: color.text }}
                          >
                            {kw.text}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 关键词高亮文本渲染 */
function KeywordHighlightedText({
  text,
  keywords,
  fontSize,
}: {
  text: string;
  keywords: { text: string; type: string }[];
  fontSize: number;
}) {
  const segments = useMemo(() => {
    if (!keywords.length) return [{ text, isKeyword: false, type: "" }];

    type Seg = { text: string; isKeyword: boolean; type: string };
    const segs: Seg[] = [];
    let cursor = 0;

    // 按在文本中出现的位置排序
    const sorted = keywords
      .map((kw) => {
        const idx = text.toLowerCase().indexOf(kw.text.toLowerCase());
        return { ...kw, pos: idx };
      })
      .filter((kw) => kw.pos >= 0)
      .sort((a, b) => a.pos - b.pos);

    for (const kw of sorted) {
      if (kw.pos < cursor) continue;
      if (kw.pos > cursor) {
        segs.push({ text: text.slice(cursor, kw.pos), isKeyword: false, type: "" });
      }
      segs.push({
        text: text.slice(kw.pos, kw.pos + kw.text.length),
        isKeyword: true,
        type: kw.type,
      });
      cursor = kw.pos + kw.text.length;
    }

    if (cursor < text.length) {
      segs.push({ text: text.slice(cursor), isKeyword: false, type: "" });
    }

    return segs;
  }, [text, keywords]);

  return (
    <p className="whitespace-pre-wrap" style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}>
      {segments.map((seg, i) => {
        if (!seg.isKeyword) {
          return <span key={i} style={{ color: "var(--color-text)" }}>{seg.text}</span>;
        }
        const color = KEYWORD_COLORS[seg.type] || KEYWORD_COLORS.detail;
        return (
          <span
            key={i}
            className="relative inline-block rounded-sm px-0.5 mx-px cursor-help group"
            style={{ background: color.bg, color: color.text, textDecoration: `underline ${color.text}`, textUnderlineOffset: "3px" }}
          >
            {seg.text}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 rounded text-xs bg-gray-800 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {seg.type === "topic" ? "主题词" : seg.type === "transition" ? "过渡词" : "细节词"}
            </span>
          </span>
        );
      })}
    </p>
  );
}

function StructureIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
