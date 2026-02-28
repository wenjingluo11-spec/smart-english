"use client";

import { useState, useMemo } from "react";
import { PURPOSE_COLORS } from "@/lib/cognitive-styles";

interface ReadingKeyWord { text: string; type: string; }

interface ReadingParagraph {
  index: number;
  start_char: number;
  end_char: number;
  topic_sentence: string;
  key_words: ReadingKeyWord[];
  difficulty: number;
  purpose: string;
  summary_zh: string;
}

interface ReadingEnhancerProps {
  content: string;
  paragraphs: ReadingParagraph[];
  structureType?: string;
  className?: string;
}



export default function ReadingEnhancer({
  content,
  paragraphs,
  structureType,
  className = "",
}: ReadingEnhancerProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (idx: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  const paraTexts = useMemo(
    () => paragraphs.map((p) => content.slice(p.start_char, p.end_char)),
    [content, paragraphs]
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {structureType && (
        <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: "rgba(37,99,235,0.1)", color: "#2563eb" }}>
          文章结构: {structureType}
        </div>
      )}

      {paragraphs.map((para, i) => {
        const isOpen = expanded.has(para.index);
        const color = PURPOSE_COLORS[para.purpose] || "#6b7280";
        return (
          <div key={para.index} className="rounded-xl overflow-hidden transition-all"
            style={{ border: `1px solid ${color}30`, background: `${color}06` }}>
            <div className="p-3 cursor-pointer select-none" onClick={() => toggle(para.index)}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs px-1.5 py-0.5 rounded text-white" style={{ background: color }}>
                  P{para.index + 1}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color }}>
                  {para.purpose}
                </span>
                <span className="flex gap-0.5 ml-auto">
                  {Array.from({ length: 5 }, (_, d) => (
                    <span key={d} className="w-1.5 h-1.5 rounded-full"
                      style={{ background: d < para.difficulty ? color : `${color}25` }} />
                  ))}
                </span>
                <span className="text-xs" style={{ color: "#9ca3af" }}>{isOpen ? "▲" : "▼"}</span>
              </div>

              <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--color-text)" }}>
                {para.topic_sentence}
              </p>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {para.key_words.map((kw, ki) => (
                  <span key={ki} className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(37,99,235,0.08)", color: "#2563eb" }}>
                    {kw.text}
                    <span className="ml-0.5 opacity-60">({kw.type})</span>
                  </span>
                ))}
              </div>

              {!isOpen && (
                <p className="text-xs mt-1.5 italic" style={{ color: "#6b7280" }}>
                  {para.summary_zh}
                </p>
              )}
            </div>

            {isOpen && (
              <div className="px-3 pb-3 animate-expand">
                <div className="pt-2 text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ borderTop: "1px solid var(--color-border, #e5e7eb)", color: "var(--color-text)" }}>
                  {paraTexts[i]}
                </div>
                <p className="text-xs mt-2 italic" style={{ color: "#6b7280" }}>
                  {para.summary_zh}
                </p>
              </div>
            )}
          </div>
        );
      })}

      <style jsx>{`
        @keyframes expand { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 500px; } }
        .animate-expand { animation: expand 0.3s ease-out; }
        @media (prefers-reduced-motion: reduce) { .animate-expand { animation: none; } }
      `}</style>
    </div>
  );
}
