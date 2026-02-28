"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";

interface ContextClue {
  text: string;
  position: "before" | "after";
  clue_type: string;
  hint: string;
}

interface ClozeBlank {
  blank_index: number;
  context_clues: ContextClue[];
  blank_type: string;
  strategy: string;
}

interface ClozeEnhancerProps {
  passage: string;
  blanks: ClozeBlank[];
  overviewStrategy?: string;
  passageKeywords?: string[];
  difficultyBlanks?: number[];
  solvingOrder?: string;
  onBlankClick?: (blankIndex: number) => void;
  /** 学霸做完形演示模式：按solving_order自动聚焦 */
  demoMode?: boolean;
  className?: string;
}

export default function ClozeEnhancer({
  passage,
  blanks,
  overviewStrategy,
  passageKeywords = [],
  difficultyBlanks = [],
  solvingOrder,
  onBlankClick,
  demoMode = false,
  className = "",
}: ClozeEnhancerProps) {
  const [activeBlank, setActiveBlank] = useState<number | null>(null);

  const diffSet = useMemo(() => new Set(difficultyBlanks), [difficultyBlanks]);
  const blankMap = useMemo(
    () => new Map(blanks.map((b) => [b.blank_index, b])),
    [blanks]
  );

  // Demo mode: auto-focus blanks by solving order
  const demoTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const orderList = useMemo(() => {
    if (!solvingOrder) return blanks.map(b => b.blank_index);
    return solvingOrder.split(/[,，、\s]+/).map(Number).filter(Boolean);
  }, [solvingOrder, blanks]);

  useEffect(() => {
    if (!demoMode || !orderList.length) return;
    let i = 0;
    const step = () => {
      if (i >= orderList.length) { setActiveBlank(null); return; }
      setActiveBlank(orderList[i]);
      i++;
      demoTimerRef.current = setTimeout(step, 2500);
    };
    step();
    return () => { if (demoTimerRef.current) clearTimeout(demoTimerRef.current); };
  }, [demoMode, orderList]);

  const handleBlankClick = useCallback(
    (idx: number) => {
      setActiveBlank((prev) => (prev === idx ? null : idx));
      onBlankClick?.(idx);
    },
    [onBlankClick]
  );

  const segments = useMemo(() => {
    const parts: { type: "text" | "blank" | "keyword"; content: string; blankIndex?: number }[] = [];
    let blankCounter = 0;
    // Split on blank patterns
    const blankRegex = /_{3,}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = blankRegex.exec(passage)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: passage.slice(lastIndex, match.index) });
      }
      blankCounter++;
      parts.push({ type: "blank", content: "", blankIndex: blankCounter });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < passage.length) {
      parts.push({ type: "text", content: passage.slice(lastIndex) });
    }

    // Now split text segments to highlight keywords
    if (passageKeywords.length === 0) return parts;
    const kwRegex = new RegExp(`(${passageKeywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    const result: typeof parts = [];
    for (const part of parts) {
      if (part.type !== "text") { result.push(part); continue; }
      let li = 0;
      let m: RegExpExecArray | null;
      kwRegex.lastIndex = 0;
      while ((m = kwRegex.exec(part.content)) !== null) {
        if (m.index > li) result.push({ type: "text", content: part.content.slice(li, m.index) });
        result.push({ type: "keyword", content: m[0] });
        li = m.index + m[0].length;
      }
      if (li < part.content.length) result.push({ type: "text", content: part.content.slice(li) });
    }
    return result;
  }, [passage, passageKeywords]);

  const activeData = activeBlank !== null ? blankMap.get(activeBlank) : null;

  return (
    <div className={`space-y-3 ${className}`}>
      {overviewStrategy && (
        <div className="p-3 rounded-xl text-sm" style={{ background: "rgba(8,145,178,0.08)", border: "1px solid rgba(8,145,178,0.2)", color: "#0891b2" }}>
          <span className="font-semibold mr-1">解题策略:</span>{overviewStrategy}
          {solvingOrder && <span className="ml-2 text-xs opacity-75">| 建议顺序: {solvingOrder}</span>}
        </div>
      )}

      <div className="text-base leading-relaxed whitespace-pre-wrap relative" style={{ color: "var(--color-text)" }}>
        {segments.map((seg, i) => {
          if (seg.type === "text") return <span key={i}>{seg.content}</span>;
          if (seg.type === "keyword") {
            return (
              <span key={i} className="px-1 py-0.5 rounded text-xs font-medium" style={{ background: "rgba(37,99,235,0.1)", color: "#2563eb" }}>
                {seg.content}
              </span>
            );
          }
          // blank
          const idx = seg.blankIndex!;
          const isDiff = diffSet.has(idx);
          const isActive = activeBlank === idx;
          return (
            <span key={i} className="relative inline-block">
              <span
                onClick={() => handleBlankClick(idx)}
                className="inline-flex items-center justify-center min-w-[3rem] px-2 py-0.5 rounded-lg cursor-pointer text-sm font-bold text-white transition-transform"
                style={{
                  background: isDiff ? "#dc2626" : isActive ? "#0891b2" : "#6b7280",
                  transform: isActive ? "scale(1.1)" : undefined,
                }}
              >
                {idx}
              </span>
              {isActive && activeData && (
                <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 w-64 p-3 rounded-xl shadow-lg animate-popup"
                  style={{ background: "var(--color-bg, #fff)", border: "1px solid var(--color-border, #e5e7eb)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-1.5 py-0.5 rounded text-white" style={{ background: "#2563eb" }}>{activeData.blank_type}</span>
                    <span className="text-xs" style={{ color: "#6b7280" }}>{activeData.strategy}</span>
                  </div>
                  {activeData.context_clues.map((clue, ci) => (
                    <div key={ci} className="text-xs mb-1.5 pl-2" style={{ borderLeft: "2px solid #2563eb" }}>
                      <span className="font-medium" style={{ color: "#2563eb" }}>{clue.text}</span>
                      <span className="mx-1" style={{ color: "#9ca3af" }}>({clue.position} · {clue.clue_type})</span>
                      <p style={{ color: "var(--color-text-secondary, #6b7280)" }}>{clue.hint}</p>
                    </div>
                  ))}
                </div>
              )}
            </span>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes popup { from { opacity: 0; transform: translate(-50%, 4px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .animate-popup { animation: popup 0.25s ease-out; }
        @media (prefers-reduced-motion: reduce) { .animate-popup { animation: none; } }
      `}</style>
    </div>
  );
}
