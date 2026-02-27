"use client";

import { useState, useMemo } from "react";
import AudioPlayer from "@/components/cognitive/AudioPlayer";

interface SentenceComponent {
  text: string;
  role: string;
  is_core: boolean;
}

interface ComplexSentence {
  original: string;
  paragraph_index: number;
  components: SentenceComponent[];
  simplified_zh: string;
  structure_hint: string;
}

interface SentenceParserProps {
  sentences: ComplexSentence[];
  /** 点击句子所在段落回调 */
  onLocateParagraph?: (paragraphIndex: number) => void;
  className?: string;
}

/** 语法角色 → 颜色 + 中文标签 */
const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  subject:              { bg: "rgba(239,68,68,0.12)",  text: "#dc2626", label: "主语" },
  predicate:            { bg: "rgba(34,197,94,0.12)",  text: "#16a34a", label: "谓语" },
  object:               { bg: "rgba(59,130,246,0.12)", text: "#2563eb", label: "宾语" },
  attributive_clause:   { bg: "rgba(168,85,247,0.12)", text: "#9333ea", label: "定语从句" },
  adverbial_clause:     { bg: "rgba(245,158,11,0.15)", text: "#d97706", label: "状语从句" },
  appositive:           { bg: "rgba(236,72,153,0.12)", text: "#db2777", label: "同位语" },
  participle:           { bg: "rgba(20,184,166,0.12)", text: "#0d9488", label: "分词短语" },
  prepositional_phrase: { bg: "rgba(107,114,128,0.1)", text: "#6b7280", label: "介词短语" },
};

const DEFAULT_STYLE = { bg: "rgba(107,114,128,0.08)", text: "#6b7280", label: "其他" };

/**
 * 长难句拆解可视化组件 — 将复杂句子按语法成分拆解，颜色区分主干/修饰。
 *
 * 功能：
 * - 主干成分（主/谓/宾）用实线边框 + 深色
 * - 修饰成分（从句/短语）用虚线边框 + 浅色
 * - 点击成分显示角色说明
 * - 简化中文翻译
 * - 句子结构提示
 * - 可朗读原句
 * - 可定位到原文段落
 */
export default function SentenceParser({
  sentences,
  onLocateParagraph,
  className = "",
}: SentenceParserProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!sentences.length) return null;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <SentenceIcon />
        <h4 className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
          长难句拆解
        </h4>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}>
          {sentences.length} 句
        </span>
      </div>

      <div className="space-y-3">
        {sentences.map((sentence, i) => (
          <SentenceCard
            key={i}
            sentence={sentence}
            index={i}
            expanded={expandedIndex === i}
            onToggle={() => setExpandedIndex(expandedIndex === i ? null : i)}
            onLocate={() => onLocateParagraph?.(sentence.paragraph_index)}
          />
        ))}
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-2 mt-4 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
        {Object.entries(ROLE_STYLES).map(([role, style]) => (
          <span key={role} className="flex items-center gap-1 text-xs" style={{ color: style.text }}>
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: style.bg, border: `1px solid ${style.text}40` }} />
            {style.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function SentenceCard({
  sentence,
  index,
  expanded,
  onToggle,
  onLocate,
}: {
  sentence: ComplexSentence;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onLocate: () => void;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      {/* 头部：结构提示 + 操作 */}
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer"
        style={{ background: "var(--color-surface-hover)" }}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium px-1.5 py-0.5 rounded"
            style={{ background: "var(--color-primary)", color: "#fff" }}>
            #{index + 1}
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {sentence.structure_hint}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onLocate(); }}
            className="text-xs px-2 py-0.5 rounded hover:bg-blue-50 transition-colors"
            style={{ color: "var(--color-primary)" }}
            title="定位到原文"
          >
            定位
          </button>
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* 展开内容 */}
      {expanded && (
        <div className="p-4 space-y-4 animate-slide-up">
          {/* 原句朗读 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>原句</span>
              <AudioPlayer text={sentence.original} compact label="朗读" />
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
              {sentence.original}
            </p>
          </div>

          {/* 成分拆解可视化 */}
          <div>
            <span className="text-xs font-medium mb-2 block" style={{ color: "var(--color-text-secondary)" }}>
              成分拆解
            </span>
            <ComponentBreakdown components={sentence.components} original={sentence.original} />
          </div>

          {/* 简化翻译 */}
          <div className="p-3 rounded-lg" style={{ background: "var(--color-surface-hover)" }}>
            <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>简化理解</span>
            <p className="text-sm mt-1" style={{ color: "var(--color-text)" }}>
              {sentence.simplified_zh}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** 成分拆解渲染 — 按原文顺序排列，颜色区分 */
function ComponentBreakdown({
  components,
  original,
}: {
  components: SentenceComponent[];
  original: string;
}) {
  const [activeRole, setActiveRole] = useState<string | null>(null);

  // 按在原文中的位置排序
  const sorted = useMemo(() => {
    return components
      .map((c) => {
        const pos = original.toLowerCase().indexOf(c.text.toLowerCase());
        return { ...c, pos: pos >= 0 ? pos : 9999 };
      })
      .sort((a, b) => a.pos - b.pos);
  }, [components, original]);

  return (
    <div className="space-y-2">
      {/* 可视化拆解 */}
      <div className="flex flex-wrap gap-1 leading-loose">
        {sorted.map((comp, i) => {
          const style = ROLE_STYLES[comp.role] || DEFAULT_STYLE;
          const isActive = activeRole === comp.role;
          return (
            <span
              key={i}
              className="inline-flex flex-col items-center cursor-pointer transition-all rounded-md px-1.5 py-0.5"
              style={{
                background: style.bg,
                border: comp.is_core
                  ? `2px solid ${style.text}60`
                  : `1px dashed ${style.text}40`,
                opacity: activeRole && !isActive ? 0.4 : 1,
                transform: isActive ? "scale(1.05)" : "scale(1)",
              }}
              onClick={() => setActiveRole(isActive ? null : comp.role)}
            >
              <span className="text-sm" style={{ color: style.text, fontWeight: comp.is_core ? 600 : 400 }}>
                {comp.text}
              </span>
              <span className="text-[10px] leading-none mt-0.5" style={{ color: `${style.text}99` }}>
                {style.label}
              </span>
            </span>
          );
        })}
      </div>

      {/* 主干提取 */}
      <div className="text-xs p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.05)", border: "1px dashed rgba(239,68,68,0.2)" }}>
        <span style={{ color: "#dc2626" }}>主干：</span>
        <span style={{ color: "var(--color-text)" }}>
          {sorted.filter((c) => c.is_core).map((c) => c.text).join(" + ")}
        </span>
      </div>
    </div>
  );
}

function SentenceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16" />
      <path d="M4 12h10" />
      <path d="M4 17h12" />
    </svg>
  );
}
