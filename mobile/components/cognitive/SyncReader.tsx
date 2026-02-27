/**
 * 移动端视听同步阅读组件 — TTS 朗读时逐词高亮跟随。
 * 需要 expo-av。
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Audio } from "expo-av";
import { API_BASE } from "../../lib/api";

interface WordBoundary {
  text: string;
  offset_ms: number;
  duration_ms: number;
}

interface SyncReaderProps {
  text: string;
  voice?: string;
  rate?: string;
  autoPlay?: boolean;
  onFinish?: () => void;
}

export default function SyncReader({
  text,
  voice = "en-US-JennyNeural",
  rate = "+0%",
  autoPlay = false,
  onFinish,
}: SyncReaderProps) {
  const [wordBoundaries, setWordBoundaries] = useState<WordBoundary[]>([]);
  const [audioKey, setAudioKey] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const prepare = useCallback(async () => {
    if (!text.trim() || ready) return;
    setLoading(true);
    try {
      const url = `${API_BASE}/tts/synthesize-with-timestamps?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}&rate=${encodeURIComponent(rate)}`;
      const res = await fetch(url);
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

  useEffect(() => { prepare(); }, [prepare]);

  useEffect(() => {
    if (autoPlay && ready && audioKey) play();
  }, [ready, autoPlay]);

  useEffect(() => {
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    setReady(false);
    setWordBoundaries([]);
    setAudioKey(null);
    setActiveIndex(-1);
    setPlaying(false);
    if (soundRef.current) { soundRef.current.unloadAsync(); soundRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, [text]);

  const play = useCallback(async () => {
    if (!audioKey) return;

    if (playing && soundRef.current) {
      await soundRef.current.pauseAsync();
      setPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: `${API_BASE}/tts/audio/${audioKey}` },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlaying(true);

      // 轮询同步高亮
      intervalRef.current = setInterval(async () => {
        if (!soundRef.current) return;
        const status = await soundRef.current.getStatusAsync();
        if (!status.isLoaded) return;
        const currentMs = status.positionMillis;
        let idx = -1;
        for (let i = 0; i < wordBoundaries.length; i++) {
          const wb = wordBoundaries[i];
          if (currentMs >= wb.offset_ms && currentMs < wb.offset_ms + wb.duration_ms) { idx = i; break; }
          if (currentMs >= wb.offset_ms + wb.duration_ms) idx = i;
        }
        setActiveIndex(idx);
        if (status.didJustFinish) {
          setPlaying(false);
          setActiveIndex(-1);
          if (intervalRef.current) clearInterval(intervalRef.current);
          onFinish?.();
        }
      }, 50);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlaying(false);
          setActiveIndex(-1);
          if (intervalRef.current) clearInterval(intervalRef.current);
          sound.unloadAsync();
          soundRef.current = null;
          onFinish?.();
        }
      });
    } catch {
      setPlaying(false);
    }
  }, [audioKey, playing, wordBoundaries, onFinish]);

  // 拆分文本
  const wordSpans = useMemo(() => {
    if (!wordBoundaries.length) return null;
    const spans: { text: string; isWord: boolean; wbIndex: number }[] = [];
    let cursor = 0;
    for (let i = 0; i < wordBoundaries.length; i++) {
      const wb = wordBoundaries[i];
      const idx = text.indexOf(wb.text, cursor);
      const matchIdx = idx >= 0 ? idx : text.toLowerCase().indexOf(wb.text.toLowerCase(), cursor);
      if (matchIdx < 0) continue;
      if (matchIdx > cursor) spans.push({ text: text.slice(cursor, matchIdx), isWord: false, wbIndex: -1 });
      spans.push({ text: text.slice(matchIdx, matchIdx + wb.text.length), isWord: true, wbIndex: i });
      cursor = matchIdx + wb.text.length;
    }
    if (cursor < text.length) spans.push({ text: text.slice(cursor), isWord: false, wbIndex: -1 });
    return spans;
  }, [text, wordBoundaries]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={ready ? play : prepare}
        disabled={loading}
        style={[styles.playBtn, playing && styles.playBtnActive]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#3B82F6" />
        ) : (
          <Text style={[styles.playText, playing && styles.playTextActive]}>
            {playing ? "⏸ 暂停" : "▶ 跟读"}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.textContainer}>
        {wordSpans ? (
          wordSpans.map((span, i) => (
            <Text
              key={i}
              style={[
                styles.word,
                span.isWord && span.wbIndex === activeIndex && styles.wordActive,
                span.isWord && span.wbIndex < activeIndex && styles.wordPast,
              ]}
            >
              {span.text}
            </Text>
          ))
        ) : (
          <Text style={styles.word}>{text}</Text>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  playBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
  },
  playBtnActive: { backgroundColor: "#3B82F6" },
  playText: { fontSize: 13, fontWeight: "600", color: "#3B82F6" },
  playTextActive: { color: "#fff" },
  textContainer: { fontSize: 15, lineHeight: 26, color: "#374151" },
  word: { color: "#6B7280" },
  wordActive: {
    color: "#1D4ED8",
    fontWeight: "600",
    backgroundColor: "rgba(59,130,246,0.15)",
    borderRadius: 3,
  },
  wordPast: { color: "#374151" },
});
