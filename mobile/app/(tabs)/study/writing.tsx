import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { api } from "../../../lib/api";
import type { WritingFeedback } from "../../../lib/types";

export default function WritingScreen() {
  const [prompt, setPrompt] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  async function handleSubmit() {
    if (!content.trim()) return Alert.alert("提示", "请输入作文内容");
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.post<WritingFeedback>("/writing/submit", {
        prompt: prompt.trim() || undefined,
        content: content.trim(),
      });
      setFeedback(res);
    } catch (e: any) {
      Alert.alert("错误", e.message);
    } finally {
      setLoading(false);
    }
  }

  const fb = feedback?.feedback_json;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TextInput
        style={styles.promptInput}
        placeholder="写作题目（可选）"
        placeholderTextColor="#9CA3AF"
        value={prompt}
        onChangeText={setPrompt}
      />

      <TextInput
        style={styles.essayInput}
        placeholder="在这里写你的作文..."
        placeholderTextColor="#9CA3AF"
        value={content}
        onChangeText={setContent}
        multiline
        textAlignVertical="top"
      />
      <Text style={styles.wordCount}>{wordCount} 词</Text>

      <TouchableOpacity
        style={[styles.submitBtn, loading && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>提交批改</Text>
        )}
      </TouchableOpacity>

      {fb && (
        <View style={styles.fbCard}>
          {feedback!.score != null && (
            <View style={styles.scoreWrap}>
              <Text style={styles.scoreNum}>{feedback!.score}</Text>
              <Text style={styles.scoreLabel}>/ 100</Text>
            </View>
          )}

          {fb.summary && <Text style={styles.fbSummary}>{fb.summary}</Text>}

          {fb.strengths && fb.strengths.length > 0 && (
            <View style={styles.fbSection}>
              <Text style={styles.fbSectionTitle}>优点</Text>
              {fb.strengths.map((s, i) => (
                <Text key={i} style={styles.fbItem}>• {s}</Text>
              ))}
            </View>
          )}

          {fb.improvements && fb.improvements.length > 0 && (
            <View style={styles.fbSection}>
              <Text style={styles.fbSectionTitle}>改进建议</Text>
              {fb.improvements.map((s, i) => (
                <Text key={i} style={styles.fbItem}>• {s}</Text>
              ))}
            </View>
          )}

          {fb.corrected_sentences && fb.corrected_sentences.length > 0 && (
            <View style={styles.fbSection}>
              <Text style={styles.fbSectionTitle}>句子修改</Text>
              {fb.corrected_sentences.map((c, i) => (
                <View key={i} style={styles.correction}>
                  <Text style={styles.corrOriginal}>{c.original}</Text>
                  <Text style={styles.corrArrow}>→</Text>
                  <Text style={styles.corrFixed}>{c.corrected}</Text>
                  <Text style={styles.corrReason}>{c.reason}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20 },
  promptInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#1F2937",
    marginBottom: 12,
  },
  essayInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#1F2937",
    minHeight: 200,
  },
  wordCount: { fontSize: 12, color: "#9CA3AF", textAlign: "right", marginTop: 4 },
  submitBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  fbCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  scoreWrap: { flexDirection: "row", alignItems: "baseline", marginBottom: 12 },
  scoreNum: { fontSize: 36, fontWeight: "700", color: "#3B82F6" },
  scoreLabel: { fontSize: 16, color: "#6B7280", marginLeft: 4 },
  fbSummary: { fontSize: 14, color: "#374151", lineHeight: 22, marginBottom: 12 },
  fbSection: { marginTop: 12 },
  fbSectionTitle: { fontSize: 15, fontWeight: "600", color: "#1F2937", marginBottom: 6 },
  fbItem: { fontSize: 14, color: "#374151", lineHeight: 22, marginLeft: 4 },
  correction: { marginBottom: 10, paddingLeft: 4 },
  corrOriginal: { fontSize: 14, color: "#EF4444", textDecorationLine: "line-through" },
  corrArrow: { fontSize: 14, color: "#9CA3AF" },
  corrFixed: { fontSize: 14, color: "#10B981", fontWeight: "500" },
  corrReason: { fontSize: 12, color: "#6B7280", marginTop: 2 },
});
