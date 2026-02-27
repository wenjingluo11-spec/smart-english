"use client";

import { useState, useMemo } from "react";
import AudioPlayer from "@/components/cognitive/AudioPlayer";

interface SentenceComponent {
  text: string;
  role: string;
  color_group: "core" | "modifier" | "connector";
  is_error?: boolean;
}

interface SentenceStructure {
  original: string;
  components: SentenceComponent[];
  pattern: string;
  grammar_point: string;
  transform?: {
    transformed: string;
    transform_type: string;
    explanation: string;
  };
}

interface GrammarVisualizerProps {
  sentences: SentenceStructure[];
  className?: string;
}

const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  subject:     { bg: "rgba(239,68,68,0.12)",  text: "#dc2626", label: "主语" },
  predicate:   { bg: "rgba(34,197,94,0.12)",  text: "#16a34a", label: "谓语" },
  object:      { bg: "rgba(59,130,246,0.12)", text: "#2563eb", label: "宾语" },
  complement:  { bg: "rgba(168,85,247,0.12)", text: "#9333ea", label: "补语" },
  adverbial:   { bg: "rgba(245,158,11,0.15)", text: "#d97706", label: "状语" },
  attributive: { bg: "rgba(236,72,153,0.12)", text: "#db2777", label: "定语" },
  conjunction: { bg: "rgba(107,114,128,0.1)",  text: "#6b7280", label: "连词" },
  auxiliary:   { bg: "rgba(20,184,166,0.12)", text: "#0d9488", label: "助词" },
};

const DEFAULT_ROLE = { bg: "rgba(107,114,128,0.08)", text: "#6b7280", label: "其他" };

const GROUP_BORDERS: Record<string, string> = {
  core: "2px solid",
  modifier: "1px dashed",
  connector: "1px dotted",
};

/**
 * 语法结构可视化组件 — 将句子按语法成分拆解，颜色区分，支持动画和语音。
 */
export default function GrammarVisualizer({ sentences, className = "" }: GrammarVisualizerProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  if (!sentences.length) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {sentences.map((s, i) => (
        <SentenceCard
          key={i}
          sentence={s}
          index={i}
          expanded={expandedIdx === i}
          onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
        />
      ))}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 pt-2" style={{ borderTop: "1px solid var(--color-border)" }}>
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

function SentenceCard({ sentence, index, expanded, onToggle }: {
  sentence: SentenceStructure; index: number; expanded: boolean; onToggle: () => void;
}) {
  const sorted = useMemo(() => {
    return sentence.components
      .map((c) => {
        const pos = sentence.original.toLowerCase().indexOf(c.text.toLowerCase());
        return { ...c, pos: pos >= 0 ? pos : 9999 };
      })
      .sort((a, b) => a.pos - b.pos);
  }, [sentence]);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 cursor-pointer"
        style={{ background: "var(--color-surface-hover)" }} onClick={onToggle}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-1.5 py-0.5 rounded text-white" style={{ background: "var(--color-primary)" }}>
            {sentence.pattern}
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{sentence.grammar_point}</span>
        </div>
        <div className="flex items-center gap-2">
          <AudioPlayer text={sentence.original} compact label="听" />
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4 animate-slide-up">
          {/* Original sentence */}
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>{sentence.original}</p>

          {/* Structure visualization */}
          <div>
            <span className="text-xs font-medium mb-2 block" style={{ color: "var(--color-text-secondary)" }}>结构拆解</span>
            <div className="flex flex-wrap gap-1.5 leading-loose">
              {sorted.map((comp, i) => {
                const style = ROLE_STYLES[comp.role] || DEFAULT_ROLE;
                const borderStyle = GROUP_BORDERS[comp.color_group] || "1px solid";
                return (
                  <span key={i} className="inline-flex flex-col items-center rounded-md px-2 py-1 transition-all hover:scale-105 cursor-default"
                    style={{
                      background: comp.is_error ? "rgba(239,68,68,0.15)" : style.bg,
                      border: `${borderStyle} ${comp.is_error ? "#ef4444" : style.text}50`,
                      textDecoration: comp.is_error ? "line-through wavy #ef4444" : "none",
                    }}>
                    <span className="text-sm" style={{ color: comp.is_error ? "#ef4444" : style.text, fontWeight: comp.color_group === "core" ? 600 : 400 }}>
                      {comp.text}
                    </span>
                    <span className="text-[10px] leading-none mt-0.5" style={{ color: `${style.text}99` }}>{style.label}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* Core extraction */}
          <div className="text-xs p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.05)", border: "1px dashed rgba(239,68,68,0.2)" }}>
            <span style={{ color: "#dc2626" }}>主干：</span>
            <span style={{ color: "var(--color-text)" }}>
              {sorted.filter((c) => c.color_group === "core").map((c) => c.text).join(" + ")}
            </span>
          </div>

          {/* Transform */}
          {sentence.transform && (
            <div className="p-3 rounded-lg" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-medium" style={{ color: "#9333ea" }}>
                  句型变换 ({sentence.transform.transform_type})
                </span>
                <AudioPlayer text={sentence.transform.transformed} compact label="听" />
              </div>
              <p className="text-sm" style={{ color: "var(--color-text)" }}>{sentence.transform.transformed}</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>{sentence.transform.explanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 语法对比组件 — 正确 vs 错误句子对比 */
export function GrammarCompareView({ data, className = "" }: {
  data: {
    correct_sentence: string; wrong_sentence: string;
    error_type: string; error_position: string; correct_version: string;
    explanation: string; rule_summary: string; similar_traps: string[];
    correct_components: SentenceComponent[]; wrong_components: (SentenceComponent & { is_error?: boolean })[];
  };
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Correct vs Wrong side by side */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-medium" style={{ color: "#16a34a" }}>正确</span>
            <AudioPlayer text={data.correct_sentence} compact label="听" />
          </div>
          <div className="flex flex-wrap gap-1 leading-loose">
            {data.correct_components.map((c, i) => {
              const style = ROLE_STYLES[c.role] || DEFAULT_ROLE;
              return (
                <span key={i} className="text-xs px-1.5 py-0.5 rounded" style={{ background: style.bg, color: style.text }}>
                  {c.text}
                </span>
              );
            })}
          </div>
        </div>
        <div className="p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs font-medium" style={{ color: "#dc2626" }}>错误</span>
            <AudioPlayer text={data.wrong_sentence} compact label="听" />
          </div>
          <div className="flex flex-wrap gap-1 leading-loose">
            {data.wrong_components.map((c, i) => {
              const style = ROLE_STYLES[c.role] || DEFAULT_ROLE;
              return (
                <span key={i} className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: c.is_error ? "rgba(239,68,68,0.15)" : style.bg,
                    color: c.is_error ? "#ef4444" : style.text,
                    textDecoration: c.is_error ? "line-through" : "none",
                  }}>
                  {c.text}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error analysis */}
      <div className="p-3 rounded-xl" style={{ background: "var(--color-surface-hover)" }}>
        {data.error_position && (
          <div className="text-xs mb-1">
            <span style={{ color: "#dc2626" }}>{data.error_position}</span>
            <span style={{ color: "var(--color-text-secondary)" }}> → </span>
            <span style={{ color: "#16a34a" }}>{data.correct_version}</span>
          </div>
        )}
        <p className="text-xs" style={{ color: "var(--color-text)" }}>{data.explanation}</p>
        {data.rule_summary && (
          <p className="text-xs mt-1.5 font-medium" style={{ color: "var(--color-primary)" }}>{data.rule_summary}</p>
        )}
      </div>

      {/* Similar traps */}
      {data.similar_traps.length > 0 && (
        <div className="p-2 rounded-lg" style={{ background: "rgba(245,158,11,0.06)" }}>
          <span className="text-xs font-medium" style={{ color: "#d97706" }}>类似易错点</span>
          <div className="mt-1 space-y-0.5">
            {data.similar_traps.map((t, i) => (
              <div key={i} className="text-xs" style={{ color: "var(--color-text-secondary)" }}>• {t}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
