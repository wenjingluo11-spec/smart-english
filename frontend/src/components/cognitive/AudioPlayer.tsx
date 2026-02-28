"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { API_BASE } from "@/lib/api";

interface AudioPlayerProps {
  text: string;
  voice?: string;
  rate?: string;
  autoPlay?: boolean;
  compact?: boolean;
  /** Icon-only circular mini button, smaller than compact */
  mini?: boolean;
  className?: string;
  label?: string;
  /** Callback when speed changes */
  onSpeedChange?: (speed: string) => void;
}

/**
 * 语音播放组件 — 调用后端 TTS 接口朗读英文文本。
 * compact 模式只显示一个播放按钮，适合嵌入题目区域。
 */
export default function AudioPlayer({
  text,
  voice = "en-US-JennyNeural",
  rate = "+0%",
  autoPlay = false,
  compact = false,
  mini = false,
  className = "",
  label,
  onSpeedChange,
}: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState(rate);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const play = useCallback(async () => {
    if (!text.trim()) return;

    // 如果正在播放，暂停
    if (playing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tts/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, rate: speed }),
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => { setPlaying(true); setLoading(false); };
      audio.onended = () => setPlaying(false);
      audio.onerror = () => { setPlaying(false); setLoading(false); };
      await audio.play();
    } catch {
      setPlaying(false);
      setLoading(false);
    }
  }, [text, voice, speed, playing]);

  // 自动播放
  useEffect(() => {
    if (autoPlay && text.trim()) {
      play();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // text 变化时停止播放
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(false);
    }
  }, [text]);

  const speedOptions = [
    { label: "慢速", value: "-20%" },
    { label: "正常", value: "+0%" },
    { label: "快速", value: "+20%" },
  ];

  if (mini) {
    return (
      <button
        onClick={play}
        disabled={loading || !text.trim()}
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-all ${
          playing
            ? "bg-blue-500 text-white"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        } disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
        title={playing ? "点击暂停" : "朗读"}
      >
        {loading ? (
          <LoadingIcon size={10} />
        ) : playing ? (
          <PauseIcon size={10} />
        ) : (
          <PlayIcon size={10} />
        )}
      </button>
    );
  }

  if (compact) {
    return (
      <button
        onClick={play}
        disabled={loading || !text.trim()}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
          playing
            ? "bg-blue-100 text-blue-700"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        } disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
        title={playing ? "点击暂停" : "朗读题目"}
      >
        {loading ? (
          <LoadingIcon />
        ) : playing ? (
          <PauseIcon />
        ) : (
          <SpeakerIcon />
        )}
        {label && <span>{label}</span>}
      </button>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg ${className}`}
      style={{ background: "var(--color-surface-hover, #f5f5f5)" }}
    >
      <button
        onClick={play}
        disabled={loading || !text.trim()}
        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
          playing
            ? "bg-blue-500 text-white"
            : "bg-white text-gray-700 hover:bg-blue-50 shadow-sm"
        } disabled:opacity-40`}
        title={playing ? "暂停" : "播放"}
      >
        {loading ? <LoadingIcon /> : playing ? <PauseIcon /> : <PlayIcon />}
      </button>

      {playing && (
        <div className="flex gap-0.5 items-end h-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-0.5 bg-blue-500 rounded-full animate-pulse"
              style={{
                height: `${8 + Math.random() * 8}px`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="flex gap-1 ml-auto">
        {speedOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => {
              setSpeed(opt.value);
              onSpeedChange?.(opt.value);
              if (playing && audioRef.current) {
                // Dynamic speed: map rate string to playbackRate instead of stopping
                const rateMap: Record<string, number> = { "-20%": 0.8, "+0%": 1, "+20%": 1.2 };
                audioRef.current.playbackRate = rateMap[opt.value] ?? 1;
              }
            }}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              speed === opt.value
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-500 hover:bg-gray-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── 图标组件 ── */

function SpeakerIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

function PlayIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function PauseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function LoadingIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="0.75" />
    </svg>
  );
}
