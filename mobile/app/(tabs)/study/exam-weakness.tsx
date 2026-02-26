import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useExamStore } from "../../../stores/exam";

type ViewMode = "list" | "exercise";

const PRIORITY_COLORS: Record<number, { bg: string; color: string; label: string }> = {
  1: { bg: "#FEE2E2", color: "#DC2626", label: "紧急" },
  2: { bg: "#FEF3C7", color: "#D97706", label: "高" },
  3: { bg: "#DBEAFE", color: "#2563EB", label: "中" },
  4: { bg: "#F0FDF4", color: "#059669", label: "低" },
};

export default function ExamWeaknessScreen() {
  const router = useRouter();
  const {
    weaknesses,
    breakthroughDetail,
    loading,
    fetchWeaknesses,
    startBreakthrough,
    submitBreakthroughExercise,
  } = useExamStore();

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [phaseComplete, setPhaseComplete] = useState(false);

  useEffect(() => {
    fetchWeaknesses();
  }, []);

  // Handle tapping a weakness item
  const handleSelectWeakness = useCallback(
    async (knowledgePointId: number) => {
      await startBreakthrough(knowledgePointId);
      setViewMode("exercise");
      setExerciseIdx(0);
      setSelectedAnswer(null);
      setFeedback(null);
      setPhaseComplete(false);
    },
    [startBreakthrough]
  );

  // Submit answer for current exercise
  const handleSubmitAnswer = useCallback(async () => {
    if (!breakthroughDetail || !selectedAnswer) return;
    setSubmitting(true);
    try {
      const res = await submitBreakthroughExercise(
        breakthroughDetail.id,
        exerciseIdx,
        selectedAnswer
      );
      setFeedback(res);
      if (res.phase_completed) {
        setPhaseComplete(true);
      }
    } catch (e: any) {
      Alert.alert("错误", e.message ?? "提交失败");
    } finally {
      setSubmitting(false);
    }
  }, [breakthroughDetail, exerciseIdx, selectedAnswer, submitBreakthroughExercise]);

  // Move to next exercise
  const handleNext = useCallback(() => {
    if (!breakthroughDetail) return;
    const nextIdx = exerciseIdx + 1;
    if (nextIdx < breakthroughDetail.exercises.length) {
      setExerciseIdx(nextIdx);
      setSelectedAnswer(null);
      setFeedback(null);
    } else {
      setPhaseComplete(true);
    }
  }, [breakthroughDetail, exerciseIdx]);

  // Return to weakness list
  const handleBackToList = useCallback(() => {
    setViewMode("list");
    setExerciseIdx(0);
    setSelectedAnswer(null);
    setFeedback(null);
    setPhaseComplete(false);
    fetchWeaknesses();
  }, [fetchWeaknesses]);

  // ── Exercise View ──
  if (viewMode === "exercise") {
    // Phase complete congratulations
    if (phaseComplete) {
      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.centerContent}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Feather name="check-circle" size={36} color="#4A90D9" />
            </View>
            <Text style={styles.congratsTitle}>阶段突破完成！</Text>
            <Text style={styles.congratsDesc}>
              {breakthroughDetail?.name ?? "知识点"}的当前阶段练习已全部完成，继续加油！
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleBackToList}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryBtnText}>返回薄弱项列表</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }

    // Loading breakthrough detail
    if (loading || !breakthroughDetail) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4A90D9" />
        </View>
      );
    }

    const exercise = breakthroughDetail.exercises[exerciseIdx];
    const totalExercises = breakthroughDetail.exercises.length;
    const isCorrect = feedback?.is_correct as boolean | undefined;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollPad}>
        {/* Header */}
        <View style={styles.exerciseHeader}>
          <TouchableOpacity onPress={handleBackToList} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#333" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.exerciseHeaderTitle} numberOfLines={1}>
              {breakthroughDetail.name}
            </Text>
          </View>
        </View>

        {/* Phase indicator */}
        <View style={styles.phaseRow}>
          {[1, 2, 3].map((p) => (
            <View
              key={p}
              style={[
                styles.phaseDot,
                p <= breakthroughDetail.current_phase
                  ? styles.phaseDotActive
                  : styles.phaseDotInactive,
              ]}
            >
              <Text
                style={[
                  styles.phaseDotText,
                  p <= breakthroughDetail.current_phase && styles.phaseDotTextActive,
                ]}
              >
                {p}
              </Text>
            </View>
          ))}
          <Text style={styles.phaseLabel}>
            第 {breakthroughDetail.current_phase} 阶段
          </Text>
        </View>

        {/* Progress */}
        <Text style={styles.progressText}>
          题目 {exerciseIdx + 1} / {totalExercises}
        </Text>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${((exerciseIdx + 1) / totalExercises) * 100}%` },
            ]}
          />
        </View>

        {/* Question card */}
        <View style={styles.card}>
          <View style={styles.typeBadgeRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{exercise.type}</Text>
            </View>
          </View>
          <Text style={styles.questionText}>{exercise.question}</Text>

          {/* Options */}
          {exercise.options && exercise.options.length > 0 && (
            <View style={styles.optionsWrap}>
              {exercise.options.map((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const isSelected = selectedAnswer === opt;
                const showResult = feedback != null;
                const isCorrectOpt = showResult && opt === exercise.answer;
                const isWrongSelected = showResult && isSelected && !isCorrectOpt;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.optionBtn,
                      isSelected && !showResult && styles.optionSelected,
                      isCorrectOpt && styles.optionCorrect,
                      isWrongSelected && styles.optionWrong,
                    ]}
                    onPress={() => {
                      if (!feedback) setSelectedAnswer(opt);
                    }}
                    disabled={!!feedback}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionLetter,
                        isSelected && !showResult && styles.optionLetterSelected,
                        isCorrectOpt && styles.optionLetterCorrect,
                        isWrongSelected && styles.optionLetterWrong,
                      ]}
                    >
                      {letter}
                    </Text>
                    <Text
                      style={[
                        styles.optionText,
                        isCorrectOpt && { color: "#059669" },
                        isWrongSelected && { color: "#DC2626" },
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Feedback */}
          {feedback && (
            <View
              style={[
                styles.feedbackBox,
                isCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
              ]}
            >
              <View style={styles.feedbackHeader}>
                <Feather
                  name={isCorrect ? "check-circle" : "x-circle"}
                  size={18}
                  color={isCorrect ? "#059669" : "#DC2626"}
                />
                <Text
                  style={[
                    styles.feedbackLabel,
                    { color: isCorrect ? "#059669" : "#DC2626" },
                  ]}
                >
                  {isCorrect ? "回答正确" : "回答错误"}
                </Text>
              </View>
              {exercise.explanation ? (
                <Text style={styles.feedbackExplanation}>
                  {exercise.explanation}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          {!feedback ? (
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (!selectedAnswer || submitting) && { opacity: 0.5 },
              ]}
              onPress={handleSubmitAnswer}
              disabled={!selectedAnswer || submitting}
              activeOpacity={0.7}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>提交答案</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleNext}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryBtnText}>
                {exerciseIdx + 1 < totalExercises ? "下一题" : "完成"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  }

  // ── List View ──
  if (loading && weaknesses.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.listPad}
      data={weaknesses}
      keyExtractor={(item) =>
        item.id != null ? String(item.id) : String(item.knowledge_point_id)
      }
      ListHeaderComponent={
        <View style={styles.listHeader}>
          <Feather name="target" size={20} color="#4A90D9" />
          <Text style={styles.listHeaderTitle}>薄弱项突破</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Feather name="check-circle" size={40} color="#059669" />
          <Text style={styles.emptyText}>暂无薄弱项，继续保持！</Text>
        </View>
      }
      renderItem={({ item }) => {
        const pri = PRIORITY_COLORS[item.priority] ?? PRIORITY_COLORS[3];
        const masteryPct = Math.round(item.mastery * 100);

        return (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleSelectWeakness(item.knowledge_point_id)}
            activeOpacity={0.7}
          >
            <View style={styles.weaknessHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.weaknessName}>{item.name}</Text>
                <Text style={styles.weaknessSection}>{item.section}</Text>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: pri.bg }]}>
                <Text style={[styles.priorityText, { color: pri.color }]}>
                  {pri.label}
                </Text>
              </View>
            </View>

            {/* Mastery progress bar */}
            <View style={styles.masteryRow}>
              <Text style={styles.masteryLabel}>掌握度</Text>
              <View style={styles.masteryBarBg}>
                <View
                  style={[
                    styles.masteryBarFill,
                    {
                      width: `${masteryPct}%`,
                      backgroundColor:
                        masteryPct >= 80
                          ? "#059669"
                          : masteryPct >= 50
                          ? "#D97706"
                          : "#DC2626",
                    },
                  ]}
                />
              </View>
              <Text style={styles.masteryPct}>{masteryPct}%</Text>
            </View>

            <View style={styles.weaknessFooter}>
              <Text style={styles.weaknessMeta}>
                阶段 {item.phase}/3 · {item.frequency}
              </Text>
              <Feather name="chevron-right" size={18} color="#999" />
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  centerContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  scrollPad: { padding: 20 },
  listPad: { padding: 16 },

  // ── Card ──
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // ── List header ──
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },

  // ── Weakness card ──
  weaknessHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  weaknessName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  weaknessSection: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  masteryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  masteryLabel: {
    fontSize: 13,
    color: "#666",
    width: 48,
  },
  masteryBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  masteryBarFill: {
    height: 8,
    borderRadius: 4,
  },
  masteryPct: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    width: 40,
    textAlign: "right",
  },
  weaknessFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weaknessMeta: {
    fontSize: 12,
    color: "#999",
  },
  emptyText: {
    color: "#666",
    fontSize: 15,
    marginTop: 12,
  },

  // ── Exercise header ──
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  exerciseHeaderTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
  },

  // ── Phase indicator ──
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  phaseDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  phaseDotActive: {
    backgroundColor: "#4A90D9",
  },
  phaseDotInactive: {
    backgroundColor: "#E5E7EB",
  },
  phaseDotText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
  },
  phaseDotTextActive: {
    color: "#fff",
  },
  phaseLabel: {
    fontSize: 13,
    color: "#666",
    marginLeft: 4,
  },

  // ── Progress ──
  progressText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBarFill: {
    height: 6,
    backgroundColor: "#4A90D9",
    borderRadius: 3,
  },

  // ── Question ──
  typeBadgeRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  typeBadge: {
    backgroundColor: "#EBF2FC",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    color: "#4A90D9",
    fontWeight: "600",
  },
  questionText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
    marginBottom: 16,
  },

  // ── Options ──
  optionsWrap: { gap: 10 },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  optionSelected: {
    borderColor: "#4A90D9",
    backgroundColor: "#EBF2FC",
  },
  optionCorrect: {
    borderColor: "#059669",
    backgroundColor: "#F0FDF4",
  },
  optionWrong: {
    borderColor: "#DC2626",
    backgroundColor: "#FEF2F2",
  },
  optionLetter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E5E7EB",
    textAlign: "center",
    lineHeight: 26,
    fontSize: 13,
    fontWeight: "700",
    color: "#666",
    overflow: "hidden",
  },
  optionLetterSelected: {
    backgroundColor: "#4A90D9",
    color: "#fff",
  },
  optionLetterCorrect: {
    backgroundColor: "#059669",
    color: "#fff",
  },
  optionLetterWrong: {
    backgroundColor: "#DC2626",
    color: "#fff",
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },

  // ── Feedback ──
  feedbackBox: {
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
  },
  feedbackCorrect: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  feedbackWrong: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  feedbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  feedbackLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  feedbackExplanation: {
    fontSize: 14,
    color: "#333",
    lineHeight: 22,
  },

  // ── Congrats ──
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EBF2FC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  congratsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  congratsDesc: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 24,
  },

  // ── Buttons ──
  primaryBtn: {
    backgroundColor: "#4A90D9",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    width: "100%",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  actionRow: {
    marginTop: 20,
    alignItems: "center",
  },
});
