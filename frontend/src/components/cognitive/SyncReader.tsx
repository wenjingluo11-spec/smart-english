"use client";

import { useMemo, useCallback, useRef, CSSProperties } from "react";
import { useAudioSync, WordBoundary } from "@/hooks/use-audio-sync";

interface SyncReaderProps {
  text: string;
  voice?: string;
  rate?: string;
  className?: string;
  autoPlay?: boolean;
  onFinish?: () => void;
  /** Custom style for the active (highlighted) word */
  highlightStyle?: CSSProperties;
  /** Click handler on individual words */
  onWordClick?: (index: number, word: WordBoundary) => void;
  /** Show a draggable progress bar below the text */
  showProgress?: boolean;
}

export default function SyncReader({
  text,
  voice = "en-US-JennyNeural",
  rate = "+0%",
  className = "",
  autoPlay = false,
  onFinish,
  highlightStyle,
  onWordClick,
  showProgress = false,
}: SyncReaderProps) {
  const sync = useAudioSync({ text, voice, rate, autoPrepare: true, onFinish });
  const progressRef = useRef<HTMLDivElement>(null);

  // autoPlay
  const autoPlayed = useRef(false);
  if (autoPlay && sync.ready && sync.audioKey && !autoPlayed.current) {
    autoPlayed.current = true;
    setTimeout(() => sync.play(), 0);
  }
  // Reset autoPlay flag when text changes
  if (!sync.ready) autoPlayed.current = false;

  const togglePlay = useCallback(() => {
    if (sync.playing) {
      sync.pause();
    } else if (sync.ready) {
      sync.play();
    } else {
      sync.prepare();
    }
  }, [sync]);

  const wordSpans = useMemo(() => {
    if (!sync.wordBoundaries.length) return null;
    const spans: { text: string; isWord: boolean; wbIndex: number }[] = [];
    let cursor = 0;

    for (let i = 0; i < sync.wordBoundaries.length; i++) {
      const wb = sync.wordBoundaries[i];
      let idx = text.indexOf(wb.text, cursor);
      if (idx < 0) {
        idx = text.toLowerCase().indexOf(wb.text.toLowerCase(), cursor);
        if (idx < 0) continue;
      }
      if (idx > cursor) {
        spans.push({ text: text.slice(cursor, idx), isWord: false, wbIndex: -1 });
      }
      spans.push({ text: text.slice(idx, idx + wb.text.length), isWord: true, wbIndex: i });
      cursor = idx + wb.text.length;
    }
    if (cursor < text.length) {
      spans.push({ text: text.slice(cursor), isWord: false, wbIndex: -1 });
    }
    return spans;
  }, [text, sync.wordBoundaries]);

  const defaultActiveStyle: CSSProperties = {
    background: "rgba(59,130,246,0.25)",
    color: "#1d4ed8",
    fontWeight: 600,
    textDecoration: "underline",
    textUnderlineOffset: "3px",
    textDecorationColor: "#3b82f6",
  };

  const activeStyle = highlightStyle
    ? { ...defaultActiveStyle, ...highlightStyle }
    : defaultActiveStyle;

  const handleProgressInteraction = useCallback(
    (clientX: number) => {
      if (!progressRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      // Estimate total duration from last word boundary
      const wbs = sync.wordBoundaries;
      if (wbs.length) {
        const last = wbs[wbs.length - 1];
        const totalMs = last.offset_ms + last.duration_ms + 200;
        sync.seekToTime(ratio * totalMs);
      }
    },
    [sync],
  );

  return (
    <div className={`${className}`}>
      {/* 控制栏 */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={togglePlay}
          disabled={sync.loading}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            sync.playing
              ? "bg-blue-500 text-white"
              : "bg-blue-50 text-blue-600 hover:bg-blue-100"
          } disabled:opacity-40`}
        >
          {sync.loading ? (
            <span className="animate-spin">{"\u27f3"}</span>
          ) : sync.playing ? (
            "\u23f8 暂停"
          ) : (
            "\u25b6 跟读"
          )}
        </button>
        {sync.playing && (
          <div className="flex gap-0.5 items-end h-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-0.5 bg-blue-500 rounded-full animate-pulse"
                style={{ height: `${4 + Math.random() * 10}px`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 同步文本 */}
      <div className="text-base leading-loose whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
        {wordSpans ? (
          wordSpans.map((span, i) => {
            if (!span.isWord) {
              return <span key={i}>{span.text}</span>;
            }
            const isActive = span.wbIndex === sync.activeWordIndex;
            const isPast = span.wbIndex < sync.activeWordIndex;
            return (
              <span
                key={i}
                className="transition-all duration-150 rounded-sm px-0.5"
                style={
                  isActive
                    ? activeStyle
                    : {
                        background: "transparent",
                        color: isPast ? "var(--color-text)" : "var(--color-text-secondary, #6b7280)",
                        fontWeight: 400,
                        textDecoration: "none",
                      }
                }
                onClick={
                  onWordClick
                    ? () => onWordClick(span.wbIndex, sync.wordBoundaries[span.wbIndex])
                    : undefined
                }
                role={onWordClick ? "button" : undefined}
                tabIndex={onWordClick ? 0 : undefined}
              >
                {span.text}
              </span>
            );
          })
        ) : (
          <span>{text}</span>
        )}
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div
          ref={progressRef}
          className="mt-3 h-2 bg-gray-200 rounded-full cursor-pointer relative"
          onClick={(e) => handleProgressInteraction(e.clientX)}
          onMouseDown={(e) => {
            const onMove = (ev: MouseEvent) => handleProgressInteraction(ev.clientX);
            const onUp = () => {
              document.removeEventListener("mousemove", onMove);
              document.removeEventListener("mouseup", onUp);
            };
            document.addEventListener("mousemove", onMove);
            document.addEventListener("mouseup", onUp);
            handleProgressInteraction(e.clientX);
          }}
          role="slider"
          aria-valuenow={Math.round(sync.progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
        >
          <div
            className="h-full bg-blue-500 rounded-full transition-[width] duration-100"
            style={{ width: `${sync.progress * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-blue-500 rounded-full shadow-sm"
            style={{ left: `calc(${sync.progress * 100}% - 7px)` }}
          />
        </div>
      )}
    </div>
  );
}
