/**
 * 移动端学霸审题演示组件 — 模拟学霸审题过程，光标跟随 + 内心独白。
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { Audio } from "expo-av";
import { API_BASE } from "../../lib/api";

interface GazeStep {
  step: number;
  target_text: string;
  action: "focus" | "scan" | "compare" | "skip" | "return";
  duration_ms: number;
  thought: string;
}

interface ExpertDemoProps {
  questionText: string;
  questionId: number;
  source: "practice" | "exam";
  onFinish?: () => void;
}

const ACTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  focus: { label: "聚焦", color: "#DC2626", bg: "rgba(239,68,68,0.1)" },
  scan: { label: "扫读", color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
  compare: { label: "对比", color: "#D97706", bg: "rgba(245,158,11,0.1)" },
  skip: { label: "跳过", color: "#6B7280", bg: "rgba(156,163,175,0.1)" },
  return: { label: "回看", color: "#7C3AED", bg: "rgba(139,92,246,0.1)" },
};

export default function ExpertDemo({ questionText, questionId, source, onFinish }: ExpertDemoProps) {
  const [gazePath, setGazePath] = useState<GazeStep[]>([]);
  const [narration, setNarration] = useState("");
  const [audioKey, setAudioKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [loaded, setLoaded] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDemo = useCallback(async () => {
    setLoading(true);
    try {
      const token = ""; // TODO: get from auth
      const res = await fetch(`${API_BASE}/cognitive/demo/${source}/${questionId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setGazePath(data.demo?.gaze_path || []);
      setNarration(data.demo?.narration || "");
      setAudioKey(data.tts?.audio_key || null);
      setLoaded(true);
    } catch {
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [questionId, source]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (soundRef.current) soundRef.current.unloadAsync();
    };
  }, []);

  const playStep = useCallback((idx: number) => {
    if (idx >= gazePath.length) {
      setPlaying(false);
      setCurrentStep(-1);
      onFinish?.();
      return;
    }
    setCurrentStep(idx);
    timerRef.current = setTimeout(() => playStep(idx + 1), gazePath[idx].duration_ms / speed);
  }, [gazePath, speed, onFinish]);

  const togglePlay = useCallback(async () => {
    if (playing) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (soundRef.current) await soundRef.current.pauseAsync();
      setPlaying(false);
      return;
    }

    setPlaying(true);
    const startFrom = currentStep < 0 ? 0 : currentStep;

    if (audioKey) {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: `${API_BASE}/tts/audio/${audioKey}` },
          { shouldPlay: true, rate: speed }
        );
        soundRef.current = sound;
      } catch {}
    }

    playStep(startFrom);
  }, [playing, currentStep, audioKey, speed, playStep]);

  const step = currentStep >= 0 ? gazePath[currentStep] : null;
  const actionInfo = step ? ACTION_LABELS[step.action] || ACTION_LABELS.focus : null;

  // 高亮渲染
  const renderText = () => {
    if (!step) return <Text style={styles.questionText}>{questionText}</Text>;
    const target = step.target_text;
    let idx = questionText.indexOf(target);
    if (idx < 0) idx = questionText.toLowerCase().indexOf(target.toLowerCase());
    if (idx < 0) return <Text style={styles.questionText}>{questionText}</Text>;

    return (
      <Text style={styles.questionText}>
        <Text style={styles.dimText}>{questionText.slice(0, idx)}</Text>
        <Text style={[styles.highlightText, { backgroundColor: actionInfo?.bg }]}>{questionText.slice(idx, idx + target.length)}</Text>
        <Text style={styles.dimText}>{questionText.slice(idx + target.length)}</Text>
      </Text>
    );
  };

  if (!loaded && !loading) {
    return (
      <TouchableOpacity style={styles.loadBtn} onPress={loadDemo}>
        <Text style={styles.loadBtnText}>👁 看学霸怎么做</Text>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#3B82F6" />
        <Text style={styles.loadingText}>生成审题演示...</Text>
      </View>
    );
  }

  if (!gazePath.length) return null;

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👁 学霸审题演示</Text>
        <View style={styles.speedRow}>
          {[0.5, 1, 1.5, 2].map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setSpeed(s)}
              style={[styles.speedBtn, speed === s && styles.speedBtnActive]}
            >
              <Text style={[styles.speedText, speed === s && styles.speedTextActive]}>{s}x</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 题目 + 高亮 */}
      <View style={styles.textArea}>{renderText()}</View>

      {/* 内心独白 */}
      {step && (
        <View style={styles.thoughtBubble}>
          <View style={styles.thoughtHeader}>
            <Text style={[styles.actionBadge, { backgroundColor: actionInfo?.bg, color: actionInfo?.color }]}>
              {actionInfo?.label}
            </Text>
            <Text style={styles.stepCount}>{step.step}/{gazePath.length}</Text>
          </View>
          <Text style={styles.thoughtText}>💭 {step.thought}</Text>
        </View>
      )}

      {/* 进度条 */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${gazePath.length > 0 ? ((currentStep + 1) / gazePath.length) * 100 : 0}%` }]} />
      </View>

      {/* 控制 */}
      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlBtn, playing && styles.controlBtnPause]} onPress={togglePlay}>
          <Text style={[styles.controlText, playing && styles.controlTextPause]}>
            {playing ? "⏸ 暂停" : currentStep > 0 ? "▶ 继续" : "▶ 开始"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 旁白 */}
      {narration ? (
        <View style={styles.narrationBox}>
          <Text style={styles.narrationLabel}>审题旁白</Text>
          <Text style={styles.narrationText}>{narration}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 16, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden", marginTop: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#F8FAFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  headerTitle: { fontSize: 13, fontWeight: "700", color: "#2563EB" },
  speedRow: { flexDirection: "row", gap: 4 },
  speedBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "#fff" },
  speedBtnActive: { backgroundColor: "#3B82F6" },
  speedText: { fontSize: 11, color: "#6B7280" },
  speedTextActive: { color: "#fff" },
  textArea: { padding: 14 },
  questionText: { fontSize: 15, lineHeight: 24, color: "#374151" },
  dimText: { color: "#9CA3AF" },
  highlightText: { fontWeight: "700", color: "#1F2937", borderRadius: 3 },
  thoughtBubble: { marginHorizontal: 14, marginBottom: 10, padding: 10, borderRadius: 12, backgroundColor: "rgba(59,130,246,0.05)", borderWidth: 1, borderColor: "rgba(59,130,246,0.1)" },
  thoughtHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  actionBadge: { fontSize: 11, fontWeight: "600", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  stepCount: { fontSize: 11, color: "#9CA3AF" },
  thoughtText: { fontSize: 13, color: "#374151", lineHeight: 20 },
  progressBar: { height: 3, backgroundColor: "#E5E7EB", marginHorizontal: 14 },
  progressFill: { height: 3, borderRadius: 2, backgroundColor: "#3B82F6" },
  controls: { padding: 14 },
  controlBtn: { alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: "#3B82F6" },
  controlBtnPause: { backgroundColor: "#F3F4F6" },
  controlText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  controlTextPause: { color: "#374151" },
  narrationBox: { marginHorizontal: 14, marginBottom: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  narrationLabel: { fontSize: 11, fontWeight: "600", color: "#9CA3AF", marginBottom: 4 },
  narrationText: { fontSize: 13, lineHeight: 20, color: "#374151" },
  loadBtn: { alignSelf: "flex-start", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#DBEAFE", marginTop: 8 },
  loadBtnText: { fontSize: 13, fontWeight: "600", color: "#3B82F6" },
  loadingContainer: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  loadingText: { fontSize: 13, color: "#6B7280" },
});
