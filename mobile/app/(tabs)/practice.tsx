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
import { api } from "../../lib/api";
import type { Question, SubmitResult } from "../../lib/types";
import AudioPlayer from "../../components/cognitive/AudioPlayer";
import CognitiveFeedback from "../../components/cognitive/CognitiveFeedback";
import SyncReader from "../../components/cognitive/SyncReader";
import ExpertDemo from "../../components/cognitive/ExpertDemo";

const TYPES = ["单选", "完形填空", "阅读理解"];
const DIFFICULTIES = [
  { label: "简单", value: 1 },
  { label: "中等", value: 3 },
  { label: "困难", value: 5 },
];

export default function PracticeScreen() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [type, setType] = useState(TYPES[0]);
  const [difficulty, setDifficulty] = useState(3);

  async function fetchQuestions() {
    setFetching(true);
    setResult(null);
    setAnswer("");
    setIdx(0);
    try {
      const qs = await api.get<Question[]>(
        `/practice/questions?question_type=${encodeURIComponent(type)}&difficulty=${difficulty}&limit=10`
      );
      if (qs.length === 0) Alert.alert("提示", "暂无题目");
      setQuestions(qs);
    } catch (e: any) {
      Alert.alert("错误", e.message);
    } finally {
      setFetching(false);
    }
  }

  async function handleSubmit() {
    if (!answer.trim()) return Alert.alert("提示", "请输入答案");
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post<SubmitResult>("/practice/submit", {
        question_id: questions[idx].id,
        answer: answer.trim(),
        time_spent: 0,
      });
      setResult(res);
    } catch (e: any) {
      Alert.alert("错误", e.message);
    } finally {
      setLoading(false);
    }
  }

  function nextQuestion() {
    if (idx < questions.length - 1) {
      setIdx(idx + 1);
      setAnswer("");
      setResult(null);
    } else {
      Alert.alert("完成", "本组题目已做完");
    }
  }

  const q = questions[idx];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Filters */}
      <Text style={styles.sectionTitle}>题目类型</Text>
      <View style={styles.chipRow}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, type === t && styles.chipActive]}
            onPress={() => setType(t)}
          >
            <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>难度</Text>
      <View style={styles.chipRow}>
        {DIFFICULTIES.map((d) => (
          <TouchableOpacity
            key={d.value}
            style={[styles.chip, difficulty === d.value && styles.chipActive]}
            onPress={() => setDifficulty(d.value)}
          >
            <Text style={[styles.chipText, difficulty === d.value && styles.chipTextActive]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.fetchBtn} onPress={fetchQuestions} disabled={fetching}>
        {fetching ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.fetchBtnText}>加载题目</Text>
        )}
      </TouchableOpacity>

      {/* Question */}
      {q && (
        <View style={styles.questionCard}>
          <View style={styles.qMeta}>
            <Text style={styles.qTag}>{q.question_type}</Text>
            <Text style={styles.qIdx}>{idx + 1}/{questions.length}</Text>
          </View>
          <Text style={styles.qContent}>{q.content}</Text>
          <View style={{ marginTop: 8 }}>
            <AudioPlayer text={q.content} compact label="朗读题目" />
          </View>

          {q.options && q.options.length > 0 && (
            <View style={styles.options}>
              {q.options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.optionBtn, answer === opt && styles.optionActive]}
                  onPress={() => setAnswer(opt)}
                >
                  <Text style={[styles.optionText, answer === opt && styles.optionTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {(!q.options || q.options.length === 0) && (
            <TextInput
              style={styles.answerInput}
              placeholder="输入你的答案"
              placeholderTextColor="#9CA3AF"
              value={answer}
              onChangeText={setAnswer}
            />
          )}

          {!result && (
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>提交答案</Text>
              )}
            </TouchableOpacity>
          )}

          {result && (
            <View style={[styles.resultCard, result.is_correct ? styles.resultCorrect : styles.resultWrong]}>
              <Text style={styles.resultTitle}>
                {result.is_correct ? "回答正确!" : "回答错误"}
              </Text>
              <Text style={styles.resultText}>正确答案: {result.correct_answer}</Text>
              {/* 认知增强反馈 */}
              <CognitiveFeedback result={result} />
              {/* V2: 视听同步跟读 */}
              <SyncReader text={q.content} />
              {/* V2: 学霸审题演示 */}
              <ExpertDemo questionText={q.content} questionId={q.id} source="practice" />
              {/* 传统解析兜底 */}
              {!result.how_to_spot && result.explanation ? (
                <Text style={styles.resultText}>{result.explanation}</Text>
              ) : null}
              <TouchableOpacity style={styles.nextBtn} onPress={nextQuestion}>
                <Text style={styles.nextBtnText}>下一题</Text>
              </TouchableOpacity>
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
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8, marginTop: 12 },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  chipText: { fontSize: 14, color: "#374151" },
  chipTextActive: { color: "#fff" },
  fetchBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  fetchBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  questionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  qMeta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  qTag: { fontSize: 12, color: "#3B82F6", backgroundColor: "#EFF6FF", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  qIdx: { fontSize: 12, color: "#6B7280" },
  qContent: { fontSize: 15, color: "#1F2937", lineHeight: 24, marginBottom: 16 },
  options: { gap: 8, marginBottom: 16 },
  optionBtn: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  optionActive: { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
  optionText: { fontSize: 14, color: "#374151" },
  optionTextActive: { color: "#3B82F6", fontWeight: "500" },
  answerInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#1F2937",
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  resultCard: { marginTop: 16, padding: 14, borderRadius: 10 },
  resultCorrect: { backgroundColor: "#F0FDF4" },
  resultWrong: { backgroundColor: "#FEF2F2" },
  resultTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 6 },
  resultText: { fontSize: 14, color: "#374151", lineHeight: 20, marginBottom: 4 },
  nextBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 10,
  },
  nextBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
