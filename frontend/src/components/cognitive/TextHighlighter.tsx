"use client";

import { useMemo } from "react";
import { HIGHLIGHT_STYLES } from "@/lib/cognitive-styles";

export interface Highlight {
  text: string;
  start: number;
  end: number;
  type: "question_eye" | "key_phrase" | "signal_word" | "distractor" | "clue";
  label?: string;
}

interface TextHighlighterProps {
  text: string;
  highlights: Highlight[];
  animated?: boolean;
  /** When true, highlights appear one-by-one with staggered delay */
  sequentialReveal?: boolean;
  /** When set, only this highlight index is fully visible; others dim to 0.4 */
  focusIndex?: number;
  /** Click handler on individual highlights */
  onHighlightClick?: (index: number, highlight: Highlight) => void;
  className?: string;
}



/** 高亮类型 → 中文标签 */
const TYPE_LABELS: Record<Highlight["type"], string> = {
  question_eye: "题眼",
  key_phrase: "关键词",
  signal_word: "信号词",
  distractor: "干扰项",
  clue: "线索",
};

interface Segment {
  text: string;
  highlight?: Highlight;
  index: number;
}

/**
 * 文本高亮渲染组件 — 将题目文本按题眼分析结果进行视觉标记。
 *
 * 支持四种标记类型：题眼(红)、信号词(橙)、干扰项(灰)、线索(蓝)。
 * 带渐入动画和 hover tooltip。
 */
export default function TextHighlighter({
  text,
  highlights,
  animated = true,
  sequentialReveal = false,
  focusIndex,
  onHighlightClick,
  className = "",
}: TextHighlighterProps) {
  const segments = useMemo(() => buildSegments(text, highlights), [text, highlights]);

  if (!highlights.length) {
    return (
      <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>
        {text}
      </div>
    );
  }

  return (
    <div className={`whitespace-pre-wrap leading-relaxed ${className}`}>
      {segments.map((seg, i) => {
        if (!seg.highlight) {
          return <span key={i}>{seg.text}</span>;
        }

        const style = HIGHLIGHT_STYLES[seg.highlight.type];
        const tooltipText = seg.highlight.label || TYPE_LABELS[seg.highlight.type];
        const isEye = seg.highlight.type === "question_eye";
        const isFocused = focusIndex === undefined || focusIndex === seg.index;
        const revealDelay = sequentialReveal ? seg.index * 300 : (animated ? seg.index * 150 : 0);

        return (
          <span
            key={i}
            onClick={onHighlightClick ? () => onHighlightClick(seg.index, seg.highlight!) : undefined}
            className={`relative inline-block group rounded-sm px-0.5 mx-px transition-all ${
              onHighlightClick ? "cursor-pointer" : "cursor-help"
            } ${sequentialReveal ? "animate-sequential-reveal" : animated ? "animate-highlight-in" : ""
            } ${isEye ? "animate-eye-pulse" : ""
            } ${isFocused ? "" : "highlight-dimmed"}`}
            style={{
              background: style.bg,
              color: style.text,
              textDecoration: style.decoration,
              textUnderlineOffset: "3px",
              fontWeight: isEye ? 700 : undefined,
              fontSize: isEye ? "1.05em" : undefined,
              border: isEye ? style.border : undefined,
              borderRadius: isEye ? "4px" : undefined,
              padding: isEye ? "1px 6px" : undefined,
              transform: isFocused && focusIndex !== undefined ? "scale(1.05)" : undefined,
              animationDelay: `${revealDelay}ms`,
              animationFillMode: "both",
            }}
          >
            {seg.text}
            {/* Tooltip */}
            <span
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded text-xs bg-gray-800 text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg"
            >
              {tooltipText}
              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
            </span>
          </span>
        );
      })}

      {/* 图例 */}
      <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t border-gray-100">
        {getUsedTypes(highlights).map((type) => {
          const style = HIGHLIGHT_STYLES[type];
          return (
            <span key={type} className="flex items-center gap-1 text-xs" style={{ color: style.text }}>
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ background: style.bg, border: style.border }}
              />
              {TYPE_LABELS[type]}
            </span>
          );
        })}
      </div>

      {/* 动画 keyframes */}
      <style jsx>{`
        @keyframes highlight-in {
          from { opacity: 0; background: transparent; text-decoration-color: transparent; }
          to { opacity: 1; }
        }
        .animate-highlight-in { animation: highlight-in 0.4s ease-out; }
        @keyframes sequential-reveal {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-sequential-reveal { animation: sequential-reveal 0.5s ease-out; }
        @keyframes eye-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0); }
        }
        .animate-eye-pulse { animation: eye-pulse 2s ease-in-out infinite; }
        .highlight-dimmed { opacity: 0.4; }
        @media (prefers-reduced-motion: reduce) {
          .animate-highlight-in,
          .animate-sequential-reveal { animation: none; opacity: 1; }
          .animate-eye-pulse { animation: none; }
        }
      `}</style>
    </div>
  );
}

/**
 * 将文本按高亮位置拆分为段落。
 * 使用文本匹配（而非纯位置），更健壮地处理 LLM 返回的 key_phrases。
 */
function buildSegments(text: string, highlights: Highlight[]): Segment[] {
  if (!highlights.length) return [{ text, index: 0 }];

  // 按 start 位置排序，去重
  const sorted = [...highlights]
    .sort((a, b) => a.start - b.start)
    .filter((h, i, arr) => i === 0 || h.start !== arr[i - 1].start);

  // 如果 start/end 位置不准确，尝试用文本匹配修正
  const corrected = sorted.map((h) => {
    if (h.start >= 0 && h.end <= text.length && text.slice(h.start, h.end) === h.text) {
      return h;
    }
    // 文本匹配修正
    const idx = text.indexOf(h.text);
    if (idx >= 0) {
      return { ...h, start: idx, end: idx + h.text.length };
    }
    // 大小写不敏感匹配
    const lowerIdx = text.toLowerCase().indexOf(h.text.toLowerCase());
    if (lowerIdx >= 0) {
      return { ...h, start: lowerIdx, end: lowerIdx + h.text.length };
    }
    return null;
  }).filter(Boolean) as Highlight[];

  // 构建段落
  const segments: Segment[] = [];
  let cursor = 0;
  let highlightIndex = 0;

  for (const h of corrected) {
    if (h.start > cursor) {
      segments.push({ text: text.slice(cursor, h.start), index: segments.length });
    }
    if (h.start >= cursor) {
      segments.push({ text: text.slice(h.start, h.end), highlight: h, index: highlightIndex++ });
      cursor = h.end;
    }
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), index: segments.length });
  }

  return segments;
}

/** 获取实际使用的高亮类型（用于图例） */
function getUsedTypes(highlights: Highlight[]): Highlight["type"][] {
  const types = new Set(highlights.map((h) => h.type));
  return Array.from(types);
}
