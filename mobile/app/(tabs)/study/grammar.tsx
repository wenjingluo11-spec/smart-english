import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useGrammarStore } from "../../../stores/grammar";

type ViewMode = "list" | "detail" | "practice";

export default function GrammarScreen() {
  const router = useRouter();
  const {
    categories, topics, topicDetail, exercises, selectedCategory, loading,
    fetchCategories, fetchTopics, fetchTopicDetail, fetchExercises,
    submitExercise, setCategory,
  } = useGrammarStore();

  const [view, setView] = useState<ViewMode>("list");
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedback, setFeedback] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchTopics();
  }, []);

  const handleTopicPress = useCallback(async (id: number) => {
    await fetchTopicDetail(id);
    setView("detail");
  }, [fetchTopicDetail]);

  const handleStartPractice = useCallback(async () => {
    if (!topicDetail) return;
    await fetchExercises(topicDetail.id);
    setExerciseIndex(0);
    setSelectedAnswer("");
    setFeedback(null);
    setView("practice");
  }, [topicDetail, fetchExercises]);

  const handleSubmit = useCallback(async () => {
    const ex = exercises[exerciseIndex];
    if (!ex || !selectedAnswer) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await submitExercise(ex.id, selectedAnswer);
      setFeedback(res);
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  }, [exercises, exerciseIndex, selectedAnswer, submitExercise]);

  const handleNextExercise = useCallback(() => {
    if (exerciseIndex < exercises.length - 1) {
      setExerciseIndex((prev) => prev + 1);
      setSelectedAnswer("");
      setFeedback(null);
    } else {
      setView("detail");
    }
  }, [exerciseIndex, exercises.length]);

  const handleBackToList = useCallback(() => {
    setView("list");
  }, []);

  const handleBackToDetail = useCallback(() => {
    setView("detail");
    setExerciseIndex(0);
    setSelectedAnswer("");
    setFeedback(null);
  }, []);

  // ── Practice View ──
  if (view === "practice") {
    const ex = exercises[exerciseIndex];
    const isLast = exerciseIndex >= exercises.length - 1;

    if (!ex) {
      return (
        <View style={styles.centerWrap}>
          <Feather name="alert-circle" size={48} color="#ccc" />
          <Text style={styles.emptyText}>暂无练习题</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleBackToDetail}>
            <Text style={styles.primaryBtnText}>返回</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.practiceHeader}>
          <TouchableOpacity onPress={handleBackToDetail} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#4A90D9" />
          </TouchableOpacity>
          <Text style={styles.practiceProgress}>
            {exerciseIndex + 1} / {exercises.length}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${((exerciseIndex + 1) / exercises.length) * 100}%` },
            ]}
          />
        </View>

        {/* Question card */}
        <View style={styles.card}>
          <Text style={styles.questionText}>{ex.content}</Text>

          {ex.options?.map((opt: string, i: number) => (
            <TouchableOpacity
              key={i}
              style={[styles.optionBtn, selectedAnswer === opt && styles.optionBtnActive]}
              onPress={() => { if (!feedback) setSelectedAnswer(opt); }}
              disabled={!!feedback}
            >
              <Text style={[styles.optionText, selectedAnswer === opt && styles.optionTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}

          {!feedback && (
            <TouchableOpacity
              style={[styles.primaryBtn, (!selectedAnswer || submitting) && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={!selectedAnswer || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>提交答案</Text>
              )}
            </TouchableOpacity>
          )}

          {feedback && (
            <View style={[styles.feedbackCard, (feedback.is_correct as boolean) ? styles.feedbackCorrect : styles.feedbackWrong]}>
              <View style={styles.feedbackRow}>
                <Feather
                  name={(feedback.is_correct as boolean) ? "check-circle" : "x-circle"}
                  size={20}
                  color={(feedback.is_correct as boolean) ? "#27AE60" : "#E74C3C"}
                />
                <Text style={[styles.feedbackTitle, { color: (feedback.is_correct as boolean) ? "#27AE60" : "#E74C3C" }]}>
                  {(feedback.is_correct as boolean) ? "回答正确" : "回答错误"}
                </Text>
              </View>
              {typeof feedback.correct_answer === "string" && !(feedback.is_correct as boolean) && (
                <Text style={styles.feedbackAnswer}>正确答案: {feedback.correct_answer}</Text>
              )}
              {typeof feedback.explanation === "string" && (
                <Text style={styles.feedbackExplanation}>{feedback.explanation}</Text>
              )}
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNextExercise}>
                <Text style={styles.primaryBtnText}>{isLast ? "完成练习" : "下一题"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  // ── Detail View ──
  if (view === "detail" && topicDetail) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={handleBackToList} style={styles.backRow}>
          <Feather name="arrow-left" size={20} color="#4A90D9" />
          <Text style={styles.backText}>返回列表</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.detailTitle}>{topicDetail.name}</Text>

          <Text style={styles.sectionLabel}>语法说明</Text>
          <Text style={styles.detailText}>{topicDetail.explanation}</Text>

          {topicDetail.examples && topicDetail.examples.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>例句</Text>
              {topicDetail.examples.map((ex: string, i: number) => (
                <View key={i} style={styles.exampleRow}>
                  <Feather name="message-circle" size={14} color="#4A90D9" />
                  <Text style={styles.exampleText}>{ex}</Text>
                </View>
              ))}
            </>
          )}

          {topicDetail.tips && topicDetail.tips.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>学习提示</Text>
              {topicDetail.tips.map((tip: string, i: number) => (
                <View key={i} style={styles.tipRow}>
                  <Feather name="star" size={14} color="#F5A623" />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleStartPractice}>
          <Feather name="edit-3" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}> 开始练习</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── List View ──
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Category filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
        <TouchableOpacity
          style={[styles.chip, selectedCategory === null && styles.chipActive]}
          onPress={() => setCategory(null)}
        >
          <Text style={[styles.chipText, selectedCategory === null && styles.chipTextActive]}>全部</Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.category}
            style={[styles.chip, selectedCategory === cat.category && styles.chipActive]}
            onPress={() => setCategory(cat.category)}
          >
            <Text style={[styles.chipText, selectedCategory === cat.category && styles.chipTextActive]}>
              {cat.category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Loading */}
      {loading && topics.length === 0 && (
        <ActivityIndicator size="large" color="#4A90D9" style={{ marginTop: 40 }} />
      )}

      {/* Empty */}
      {!loading && topics.length === 0 && (
        <View style={styles.emptyWrap}>
          <Feather name="book-open" size={48} color="#ccc" />
          <Text style={styles.emptyText}>暂无语法主题</Text>
        </View>
      )}

      {/* Topic cards */}
      {topics.map((topic) => (
        <TouchableOpacity
          key={topic.id}
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => handleTopicPress(topic.id)}
        >
          <View style={styles.topicHeader}>
            <Text style={styles.topicName}>{topic.name}</Text>
            <Feather name="chevron-right" size={18} color="#999" />
          </View>
          <View style={styles.topicMeta}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{topic.category}</Text>
            </View>
            <Text style={styles.metaText}>难度 {"★".repeat(Math.min(topic.difficulty, 5))}</Text>
            {topic.cefr_level && <Text style={styles.cefrBadge}>{topic.cefr_level}</Text>}
          </View>
          {/* Mastery progress bar */}
          <View style={styles.masteryWrap}>
            <View style={styles.masteryBarBg}>
              <View style={[styles.masteryBarFill, { width: `${(topic.mastery ?? 0) * 100}%` }]} />
            </View>
            <Text style={styles.masteryLabel}>{Math.round((topic.mastery ?? 0) * 100)}%</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { padding: 16, paddingBottom: 40 },

  /* Center */
  centerWrap: { flex: 1, backgroundColor: "#F5F7FA", alignItems: "center", justifyContent: "center", padding: 32 },
  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, color: "#999", marginTop: 12 },

  /* Card */
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  /* Category chips */
  chipScroll: { marginBottom: 16, flexGrow: 0 },
  chipRow: { gap: 8, paddingRight: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipActive: { backgroundColor: "#4A90D9", borderColor: "#4A90D9" },
  chipText: { fontSize: 14, color: "#666" },
  chipTextActive: { color: "#fff", fontWeight: "600" },

  /* Topic card */
  topicHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  topicName: { fontSize: 16, fontWeight: "600", color: "#333", flex: 1, marginRight: 8 },
  topicMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  metaBadge: { backgroundColor: "#EBF3FC", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  metaBadgeText: { fontSize: 12, color: "#4A90D9", fontWeight: "500" },
  metaText: { fontSize: 12, color: "#F5A623" },
  cefrBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    backgroundColor: "#4A90D9",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: "hidden",
  },

  /* Mastery bar */
  masteryWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  masteryBarBg: { flex: 1, height: 6, backgroundColor: "#E5E7EB", borderRadius: 3 },
  masteryBarFill: { height: 6, backgroundColor: "#4A90D9", borderRadius: 3 },
  masteryLabel: { fontSize: 12, color: "#666", fontWeight: "500", width: 36, textAlign: "right" },

  /* Detail view */
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  backText: { fontSize: 15, color: "#4A90D9", fontWeight: "500" },
  detailTitle: { fontSize: 20, fontWeight: "700", color: "#333", marginBottom: 16 },
  sectionLabel: { fontSize: 14, fontWeight: "600", color: "#4A90D9", marginTop: 16, marginBottom: 8 },
  detailText: { fontSize: 14, color: "#333", lineHeight: 24 },
  exampleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  exampleText: { flex: 1, fontSize: 14, color: "#333", lineHeight: 22 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  tipText: { flex: 1, fontSize: 14, color: "#666", lineHeight: 22 },

  /* Practice view */
  practiceHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  backBtn: { marginRight: 10 },
  practiceProgress: { fontSize: 14, fontWeight: "600", color: "#333" },
  progressBarBg: { height: 6, backgroundColor: "#E5E7EB", borderRadius: 3, marginBottom: 16 },
  progressBarFill: { height: 6, backgroundColor: "#4A90D9", borderRadius: 3 },
  questionText: { fontSize: 16, color: "#333", lineHeight: 24, fontWeight: "500", marginBottom: 16 },

  /* Options */
  optionBtn: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    marginBottom: 10,
  },
  optionBtnActive: { borderColor: "#4A90D9", backgroundColor: "#EBF3FC" },
  optionText: { fontSize: 15, color: "#333" },
  optionTextActive: { color: "#4A90D9", fontWeight: "500" },

  /* Primary button */
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#4A90D9",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  /* Feedback */
  feedbackCard: { marginTop: 16, padding: 14, borderRadius: 12 },
  feedbackCorrect: { backgroundColor: "#F0FDF4" },
  feedbackWrong: { backgroundColor: "#FEF2F2" },
  feedbackRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  feedbackTitle: { fontSize: 16, fontWeight: "600" },
  feedbackAnswer: { fontSize: 14, color: "#27AE60", fontWeight: "500", marginBottom: 6 },
  feedbackExplanation: { fontSize: 14, color: "#333", lineHeight: 22, marginBottom: 8 },
});
