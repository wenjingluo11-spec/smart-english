"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { API_BASE } from "@/lib/api";

export interface WordBoundary {
  text: string;
  offset_ms: number;
  duration_ms: number;
}

export interface SyncState {
  /** 当前高亮的词索引 */
  activeWordIndex: number;
  /** 当前播放时间（ms） */
  currentMs: number;
  /** 是否正在播放 */
  playing: boolean;
  /** 是否正在加载 */
  loading: boolean;
  /** 音频是否就绪 */
  ready: boolean;
  /** 词级时间戳数据 */
  wordBoundaries: WordBoundary[];
  /** 音频 key */
  audioKey: string | null;
  /** 播放进度 0-1 */
  progress: number;
}

interface UseAudioSyncOptions {
  /** TTS 文本 */
  text: string;
  voice?: string;
  rate?: string;
  /** 播放速率 */
  speed?: number;
  /** 自动准备（加载 TTS 数据） */
  autoPrepare?: boolean;
  /** 播放完成回调 */
  onFinish?: () => void;
  /** 每帧同步回调，返回当前时间（ms），用于外部驱动动画 */
  onSync?: (currentMs: number) => void;
  /** 词变化回调，仅在 activeWordIndex 变化时触发 */
  onWordChange?: (index: number, word: WordBoundary | null) => void;
}

/**
 * 音频同步引擎 hook — 基于 rAF + audio.currentTime 的真同步方案。
 *
 * 从 SyncReader 提取的核心同步逻辑，可被 SyncReader / ExpertDemo / MultimodalEnhancer 共用。
 *
 * 提供两种同步粒度：
 * 1. 词级同步：activeWordIndex 自动跟踪当前播放到哪个词
 * 2. 时间轴同步：onSync 回调每帧推送 currentMs，外部可据此驱动 gaze_path 等动画
 */
export function useAudioSync({
  text,
  voice = "en-US-JennyNeural",
  rate = "+0%",
  speed = 1,
  autoPrepare = true,
  onFinish,
  onSync,
  onWordChange,
}: UseAudioSyncOptions): SyncState & {
  prepare: () => Promise<void>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  replay: () => void;
  seekToStep: (stepStartMs: number) => void;
  seekToTime: (ms: number) => void;
  setSpeed: (speed: number) => void;
} {
  const [wordBoundaries, setWordBoundaries] = useState<WordBoundary[]>([]);
  const [audioKey, setAudioKey] = useState<string | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const [currentMs, setCurrentMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(speed);
  const onSyncRef = useRef(onSync);
  const onFinishRef = useRef(onFinish);
  const onWordChangeRef = useRef(onWordChange);
  const prevWordIndexRef = useRef(-1);
  onSyncRef.current = onSync;
  onFinishRef.current = onFinish;
  onWordChangeRef.current = onWordChange;

  // Sync external speed prop changes
  useEffect(() => {
    setPlaybackSpeed(speed);
  }, [speed]);

  // 获取 TTS 时间戳数据
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
    if (autoPrepare) prepare();
  }, [autoPrepare, prepare]);

  // text 变化重置
  useEffect(() => {
    setReady(false);
    setWordBoundaries([]);
    setAudioKey(null);
    setActiveWordIndex(-1);
    setCurrentMs(0);
    setPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
  }, [text]);

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

  // rAF 同步循环
  const syncLoop = useCallback(() => {
    if (!audioRef.current) return;
    const ms = audioRef.current.currentTime * 1000;
    setCurrentMs(ms);

    // 词级同步
    let idx = -1;
    for (let i = 0; i < wordBoundaries.length; i++) {
      const wb = wordBoundaries[i];
      if (ms >= wb.offset_ms && ms < wb.offset_ms + wb.duration_ms) {
        idx = i;
        break;
      }
      if (ms >= wb.offset_ms + wb.duration_ms) {
        idx = i;
      }
    }
    setActiveWordIndex(idx);

    // onWordChange: 仅在索引变化时触发
    if (idx !== prevWordIndexRef.current) {
      prevWordIndexRef.current = idx;
      onWordChangeRef.current?.(idx, idx >= 0 ? wordBoundaries[idx] : null);
    }

    // 外部同步回调
    onSyncRef.current?.(ms);

    rafRef.current = requestAnimationFrame(syncLoop);
  }, [wordBoundaries]);

  // 速度变化时更新
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const play = useCallback(() => {
    if (!audioKey) return;
    if (playing) return;

    const audio = audioRef.current || new Audio(`${API_BASE}/tts/audio/${audioKey}`);
    audioRef.current = audio;
    audio.playbackRate = playbackSpeed;

    audio.onplay = () => {
      setPlaying(true);
      rafRef.current = requestAnimationFrame(syncLoop);
    };
    audio.onended = () => {
      setPlaying(false);
      setActiveWordIndex(-1);
      cancelAnimationFrame(rafRef.current);
      onFinishRef.current?.();
    };
    audio.onerror = () => {
      setPlaying(false);
      cancelAnimationFrame(rafRef.current);
    };

    audio.play().catch(() => setPlaying(false));
  }, [audioKey, playing, playbackSpeed, syncLoop]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlaying(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
    setActiveWordIndex(-1);
    setCurrentMs(0);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const replay = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
    setActiveWordIndex(-1);
    setCurrentMs(0);
    setPlaying(false);
    // 下一帧开始播放
    setTimeout(() => play(), 50);
  }, [play]);

  const seekToStep = useCallback((stepStartMs: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = stepStartMs / 1000;
    }
  }, []);

  const seekToTime = useCallback((ms: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = ms / 1000;
    }
  }, []);

  const setSpeedFn = useCallback((newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  }, []);

  const totalDuration = audioRef.current?.duration ?? 0;
  const progress = totalDuration > 0 ? Math.min(currentMs / (totalDuration * 1000), 1) : 0;

  return {
    activeWordIndex,
    currentMs,
    playing,
    loading,
    ready,
    wordBoundaries,
    audioKey,
    progress,
    prepare,
    play,
    pause,
    stop,
    replay,
    seekToStep,
    seekToTime,
    setSpeed: setSpeedFn,
  };
}

/**
 * 根据 gaze_path 步骤的 duration_ms 计算每个步骤的起始时间（ms）。
 * 用于将 gaze_path 映射到音频时间轴。
 */
export function buildStepTimeline(steps: { duration_ms: number }[]): number[] {
  const timeline: number[] = [];
  let offset = 0;
  for (const step of steps) {
    timeline.push(offset);
    offset += step.duration_ms;
  }
  return timeline;
}

/**
 * 根据当前音频时间（ms）找到对应的 gaze_path 步骤索引。
 */
export function findCurrentStep(currentMs: number, timeline: number[], durations: number[]): number {
  for (let i = timeline.length - 1; i >= 0; i--) {
    if (currentMs >= timeline[i]) return i;
  }
  return -1;
}
