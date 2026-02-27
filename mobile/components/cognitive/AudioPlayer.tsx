/**
 * 移动端语音播放组件 — 调用后端 TTS 接口朗读英文文本。
 * 需要安装 expo-av: npx expo install expo-av
 */

import { useState, useRef, useEffect } from "react";
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from "react-native";
import { Audio } from "expo-av";
import { API_BASE } from "../../lib/api";

interface AudioPlayerProps {
  text: string;
  voice?: string;
  rate?: string;
  compact?: boolean;
  label?: string;
}

export default function AudioPlayer({
  text,
  voice = "en-US-JennyNeural",
  rate = "+0%",
  compact = false,
  label = "朗读",
}: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const ttsUrl = `${API_BASE}/tts/synthesize?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}&rate=${encodeURIComponent(rate)}`;

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  // text 变化时停止播放
  useEffect(() => {
    if (soundRef.current) {
      soundRef.current.unloadAsync();
      soundRef.current = null;
      setPlaying(false);
    }
  }, [text]);

  const handlePress = async () => {
    if (!text.trim()) return;

    if (playing && soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setPlaying(false);
      return;
    }

    try {
      setLoading(true);
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: ttsUrl },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlaying(true);
      setLoading(false);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlaying(false);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch {
      setPlaying(false);
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={[styles.compactBtn, playing && styles.compactBtnActive]}
        disabled={loading || !text.trim()}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#3B82F6" />
        ) : (
          <Text style={[styles.compactText, playing && styles.compactTextActive]}>
            {playing ? "⏸" : "🔊"} {label}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePress}
        style={[styles.playBtn, playing && styles.playBtnActive]}
        disabled={loading || !text.trim()}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.playIcon}>{playing ? "⏸" : "▶"}</Text>
        )}
      </TouchableOpacity>
      {playing && (
        <View style={styles.waveContainer}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.waveDot, { height: 6 + Math.random() * 8 }]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  compactBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  compactBtnActive: { backgroundColor: "#DBEAFE" },
  compactText: { fontSize: 12, color: "#6B7280" },
  compactTextActive: { color: "#3B82F6" },
  container: { flexDirection: "row", alignItems: "center", gap: 8 },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  playBtnActive: { backgroundColor: "#2563EB" },
  playIcon: { color: "#fff", fontSize: 14 },
  waveContainer: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 16 },
  waveDot: { width: 2, backgroundColor: "#3B82F6", borderRadius: 1 },
});
