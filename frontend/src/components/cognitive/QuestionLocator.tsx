"use client";

import { useState, useCallback, useRef } from "react";

interface QuestionMapping {
  question_index: number;
  relevant_paragraph: number;
  evidence_text: string;
  evidence_start_char: number;
  question_type: string;
  core_info: string;
  distractor_analysis: string;
}

interface QuestionLocatorProps {
  questions: { index: number; text: string }[];
  questionMapping: QuestionMapping[];
  contentRef: React.RefObject<HTMLElement | null>;
  className?: string;
}

export default function QuestionLocator({
  questions,
  questionMapping,
  contentRef,
  className = "",
}: QuestionLocatorProps) {
  const [active, setActive] = useState<number | null>(null);
  const highlightRef = useRef<HTMLElement | null>(null);

  const mappingMap = new Map(questionMapping.map((m) => [m.question_index, m]));

  const locate = useCallback((qIdx: number) => {
    setActive(qIdx);
    const mapping = mappingMap.get(qIdx);
    const el = contentRef.current;
    if (!mapping || !el) return;

    // Remove previous highlight
    if (highlightRef.current) {
      const parent = highlightRef.current.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlightRef.current.textContent || ""), highlightRef.current);
        parent.normalize();
      }
      highlightRef.current = null;
    }

    // Find evidence text in DOM via TreeWalker
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const idx = node.textContent?.indexOf(mapping.evidence_text) ?? -1;
      if (idx === -1) continue;

      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + mapping.evidence_text.length);

      const mark = document.createElement("mark");
      mark.className = "ql-flash";
      mark.style.cssText = "background:#fef08a;border-radius:2px;transition:background 0.3s;";
      range.surroundContents(mark);
      highlightRef.current = mark;

      mark.scrollIntoView({ behavior: "smooth", block: "center" });

      // Flash effect
      setTimeout(() => { mark.style.background = "#fde047"; }, 300);
      setTimeout(() => { mark.style.background = "#fef9c3"; }, 1200);
      break;
    }
  }, [contentRef, mappingMap]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-xs font-semibold mb-1" style={{ color: "var(--color-text-secondary, #6b7280)" }}>
        题目定位
      </div>
      <div className="flex flex-wrap gap-2">
        {questions.map((q) => {
          const mapping = mappingMap.get(q.index);
          const isActive = active === q.index;
          return (
            <div key={q.index} className="relative group">
              <button
                onClick={() => locate(q.index)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: isActive ? "#2563eb" : "var(--color-surface-hover, #f3f4f6)",
                  color: isActive ? "#fff" : "var(--color-text, #374151)",
                  border: isActive ? "1px solid #2563eb" : "1px solid var(--color-border, #e5e7eb)",
                }}
              >
                Q{q.index + 1}
                {mapping && (
                  <span className="ml-1 text-xs opacity-70">P{mapping.relevant_paragraph + 1}</span>
                )}
              </button>
              {mapping?.core_info && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg"
                  style={{ background: "#1f2937", color: "#fff", maxWidth: "200px", whiteSpace: "normal" }}>
                  {mapping.core_info}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {active !== null && mappingMap.get(active) && (
        <div className="p-2.5 rounded-xl text-xs animate-fade-in" style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.15)" }}>
          <span className="font-semibold" style={{ color: "#2563eb" }}>{mappingMap.get(active)!.question_type}</span>
          {mappingMap.get(active)!.distractor_analysis && (
            <p className="mt-1" style={{ color: "var(--color-text-secondary, #6b7280)" }}>
              {mappingMap.get(active)!.distractor_analysis}
            </p>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        @media (prefers-reduced-motion: reduce) { .animate-fade-in { animation: none; } }
      `}</style>
    </div>
  );
}
