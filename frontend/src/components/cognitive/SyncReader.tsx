"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { API_BASE } from "@/lib/api";

interface WordBoundary {
  text: string;
  offset_ms: number;
  duration_ms: number;
}

interface SyncReaderProps {
  text: string;
  voice?: string;
  rate?: string;
  className?: string;
  /** 自动开始播放 */
  autoPlay?: boolean;
  /** 播放完成回调 */
  onFinish?: () => void;
}

/**
 * 视听同步阅读组件 — TTS 朗读时逐词高亮跟随，类似卡拉OK字幕效果。
 *
 * 工作流程：
 * 1. 调用 /tts/synthesize-with-timestamps 获取音频 key + 词级时间戳
 * 2. 通过 /tts/audio/{key} 播放音频
 * 3. 监听 audio.timeupdate，根据当前播放时间匹配高亮词
 */
export default function SyncReader({
  text,
  voice = "en-US-JennyNeural",
  rate = "+0%",
  className = "",
  autoPlay = false,
  onFinish,
}: SyncReaderProps) {
  const [wordBoundaries, setWordBoundaries] = useState<WordBoundary[]>([]);
  const [audioKey, setAudioKey] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  // 获取时间戳数据
  const prepare = useCallback(async () => {
    if (!text.trim() || ready) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tts/synthesize-with-timestamps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, rate }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const data = await res.json();
      setWordBoundaries(data.word_boundaries || []);
      setAudioKey(data.audio_key || null);
      setReady(true);
    } catch {
      setReady(false);
    } finally {
      setLoading(false);
    }
  }, [text, voice, rate, ready]);

  // 自动准备
  useEffect(() => {
    prepare();
  }, [prepare]);

  // autoPlay
  useEffect(() => {
    if (autoPlay && ready && audioKey) {
      play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, autoPlay]);

  // 清理
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // text 变化重置
  useEffect(() => {
    setReady(false);
    setWordBoundaries([]);
    setAudioKey(null);
    setActiveIndex(-1);
    setPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [text]);

  // 实时同步：用 rAF 轮询 currentTime 匹配当前词
  const syncHighlight = useCallback(() => {
    if (!audioRef.current || !playing) return;
    const currentMs = audioRef.current.currentTime * 1000;
    let idx = -1;
    for (let i = 0; i < wordBoundaries.length; i++) {
      const wb = wordBoundaries[i];
      if (currentMs >= wb.offset_ms && currentMs < wb.offset_ms + wb.duration_ms) {
        idx = i;
        break;
      }
      // 如果在两个词之间的间隙，保持上一个词高亮
      if (currentMs >= wb.offset_ms + wb.duration_ms) {
        idx = i;
      }
    }
    setActiveIndex(idx);
    rafRef.current = requestAnimationFrame(syncHighlight);
  }, [wordBoundaries, playing]);

  const play = useCallback(() => {
    if (!audioKey) return;

    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const audio = new Audio(`${API_BASE}/tts/audio/${audioKey}`);
    audioRef.current = audio;

    audio.onplay = () => {
      setPlaying(true);
      rafRef.current = requestAnimationFrame(syncHighlight);
    };
    audio.onended = () => {
      setPlaying(false);
      setActiveIndex(-1);
      cancelAnimationFrame(rafRef.current);
      onFinish?.();
    };
    audio.onerror = () => {
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    };

    audio.play().catch(() => setPlaying(false));
  }, [audioKey, playing, syncHighlight, onFinish]);

  // 将文本按 word boundaries 拆分为可渲染的 spans
  const wordSpans = useMemo(() => {
    if (!wordBoundaries.length) return null;

    const spans: { text: string; isWord: boolean; wbIndex: number }[] = [];
    let cursor = 0;

    for (let i = 0; i < wordBoundaries.length; i++) {
      const wb = wordBoundaries[i];
      // 在原文中查找这个词
      const idx = text.indexOf(wb.text, cursor);
      if (idx < 0) {
        // 大小写不敏感
        const lowerIdx = text.toLowerCase().indexOf(wb.text.toLowerCase(), cursor);
        if (lowerIdx >= 0) {
          if (lowerIdx > cursor) {
            spans.push({ text: text.slice(cursor, lowerIdx), isWord: false, wbIndex: -1 });
          }
          spans.push({ text: text.slice(lowerIdx, lowerIdx + wb.text.length), isWord: true, wbIndex: i });
          cursor = lowerIdx + wb.text.length;
        }
        continue;
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
  }, [text, wordBoundaries]);

  return (
    <div className={`${className}`}>
      {/* 控制栏 */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={ready ? play : prepare}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            playing
              ? "bg-blue-500 text-white"
              : "bg-blue-50 text-blue-600 hover:bg-blue-100"
          } disabled:opacity-40`}
        >
          {loading ? (
            <span className="animate-spin">⟳</span>
          ) : playing ? (
            "⏸ 暂停"
          ) : (
            "▶ 跟读"
          )}
        </button>
        {playing && (
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
            const isActive = span.wbIndex === activeIndex;
            const isPast = span.wbIndex < activeIndex;
            return (
              <span
                key={i}
                className="transition-all duration-150 rounded-sm px-0.5"
                style={{
                  background: isActive ? "rgba(59,130,246,0.25)" : "transparent",
                  color: isActive ? "#1d4ed8" : isPast ? "var(--color-text)" : "var(--color-text-secondary, #6b7280)",
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: isActive ? "underline" : "none",
                  textUnderlineOffset: "3px",
                  textDecorationColor: isActive ? "#3b82f6" : "transparent",
                }}
              >
                {span.text}
              </span>
            );
          })
        ) : (
          <span>{text}</span>
        )}
      </div>
    </div>
  );
}
