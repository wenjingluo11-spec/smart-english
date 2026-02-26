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
import { useClinicStore } from "../../../stores/clinic";

const SEVERITY_MAP: Record<string, { label: string; bg: string; color: string }> = {
  high: { label: "严重", bg: "#FEE2E2", color: "#DC2626" },
  medium: { label: "中等", bg: "#FEF3C7", color: "#D97706" },
  low: { label: "轻微", bg: "#DCFCE7", color: "#16A34A" },
};

export default function ClinicScreen() {
  const router = useRouter();
  const {
    patterns, currentPlan, diagnosing, summary,
    diagnose, fetchPatterns, startTreatment, submitExercise,
  } = useClinicStore();

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedback, setFeedback] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [planCompleted, setPlanCompleted] = useState(false);

  useEffect(() => {
    fetchPatterns();
  }, []);

  const handleDiagnose = useCallback(async () => {
    await diagnose();
  }, [diagnose]);

  const handleStartTreatment = useCallback(async (patternId: number) => {
    setExerciseIndex(0);
    setSelectedAnswer("");
    setFeedback(null);
    setPlanCompleted(false);
    await startTreatment(patternId);
  }, [startTreatment]);

  const handleSubmitExercise = useCallback(async () => {
    if (!currentPlan || !selectedAnswer) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await submitExercise(currentPlan.id, exerciseIndex, selectedAnswer);
      setFeedback(res);
      if (res.plan_completed) {
        setPlanCompleted(true);
      }
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  }, [currentPlan, exerciseIndex, selectedAnswer, submitExercise]);

  const handleNext = useCallback(() => {
    setExerciseIndex((prev) => prev + 1);
    setSelectedAnswer("");
    setFeedback(null);
  }, []);

  const handleBackToPatterns = useCallback(() => {
    setPlanCompleted(false);
    setExerciseIndex(0);
    setSelectedAnswer("");
    setFeedback(null);
    fetchPatterns();
  }, [fetchPatterns]);

  // ── Exercise View ──
  if (currentPlan && !planCompleted) {
    const exercises = currentPlan.exercises_json?.exercises ?? [];
    const exercise = exercises[exerciseIndex];
    const totalExercises = exercises.length;
    const completedExercises = currentPlan.completed_exercises ?? exerciseIndex;

    if (!exercise) {
      return (
        <View style={styles.centerWrap}>
          <Feather name="check-circle" size={48} color="#27AE60" />
          <Text style={styles.completeTitle}>练习已完成</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleBackToPatterns}>
            <Text style={styles.primaryBtnText}>返回列表</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <TouchableOpacity onPress={handleBackToPatterns} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color="#4A90D9" />
            </TouchableOpacity>
            <Text style={styles.progressLabel}>
              练习进度 {completedExercises + 1} / {totalExercises}
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${((completedExercises + 1) / totalExercises) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Question */}
        <View style={styles.exerciseCard}>
          <Text style={styles.exerciseQuestion}>{exercise.question}</Text>

          {/* Options */}
          {exercise.options?.map((opt: string, i: number) => (
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

          {/* Submit */}
          {!feedback && (
            <TouchableOpacity
              style={[styles.primaryBtn, (!selectedAnswer || submitting) && { opacity: 0.5 }]}
              onPress={handleSubmitExercise}
              disabled={!selectedAnswer || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>提交答案</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Feedback */}
          {feedback && (
            <View style={[styles.feedbackCard, (feedback.is_correct as boolean) ? styles.feedbackCorrect : styles.feedbackWrong]}>
              <View style={styles.feedbackHeader}>
                <Feather
                  name={(feedback.is_correct as boolean) ? "check-circle" : "x-circle"}
                  size={20}
                  color={(feedback.is_correct as boolean) ? "#27AE60" : "#E74C3C"}
                />
                <Text style={[styles.feedbackTitle, { color: (feedback.is_correct as boolean) ? "#27AE60" : "#E74C3C" }]}>
                  {(feedback.is_correct as boolean) ? "回答正确" : "回答错误"}
                </Text>
              </View>
              {typeof feedback.explanation === "string" && (
                <Text style={styles.feedbackExplanation}>{feedback.explanation}</Text>
              )}
              <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
                <Text style={styles.primaryBtnText}>下一题</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  // ── Plan Completed ──
  if (planCompleted) {
    return (
      <View style={styles.centerWrap}>
        <Feather name="award" size={56} color="#4A90D9" />
        <Text style={styles.completeTitle}>治疗计划完成!</Text>
        <Text style={styles.completeSubtitle}>继续保持，攻克更多语法难点</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleBackToPatterns}>
          <Text style={styles.primaryBtnText}>返回诊断列表</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Diagnosing ──
  if (diagnosing) {
    return (
      <View style={styles.centerWrap}>
        <ActivityIndicator size="large" color="#4A90D9" />
        <Text style={styles.diagnosingText}>正在分析你的语法薄弱点...</Text>
      </View>
    );
  }

  // ── Initial / Pattern List ──
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Diagnose Button */}
      <TouchableOpacity style={styles.diagnoseBtn} onPress={handleDiagnose}>
        <Feather name="activity" size={20} color="#fff" />
        <Text style={styles.diagnoseBtnText}>开始诊断</Text>
      </TouchableOpacity>

      {/* Summary */}
      {summary ? (
        <View style={styles.summaryCard}>
          <Feather name="file-text" size={18} color="#4A90D9" />
          <Text style={styles.summaryText}>{summary}</Text>
        </View>
      ) : null}

      {/* Pattern List */}
      {patterns.length === 0 && !summary && (
        <View style={styles.emptyWrap}>
          <Feather name="search" size={48} color="#ccc" />
          <Text style={styles.emptyText}>点击上方按钮开始语法诊断</Text>
        </View>
      )}

      {patterns.map((p) => {
        const sev = SEVERITY_MAP[p.severity] ?? SEVERITY_MAP.medium;
        return (
          <View key={p.id} style={styles.patternCard}>
            <View style={styles.patternHeader}>
              <Text style={styles.patternTitle}>{p.title}</Text>
              <View style={[styles.severityBadge, { backgroundColor: sev.bg }]}>
                <Text style={[styles.severityText, { color: sev.color }]}>{sev.label}</Text>
              </View>
            </View>
            <Text style={styles.patternDesc}>{p.description}</Text>
            <View style={styles.patternFooter}>
              <Text style={styles.patternStatus}>
                {p.status === "treated" ? "已治疗" : p.status === "treating" ? "治疗中" : "待治疗"}
              </Text>
              <TouchableOpacity
                style={styles.treatBtn}
                onPress={() => handleStartTreatment(p.id)}
              >
                <Feather name="zap" size={14} color="#fff" />
                <Text style={styles.treatBtnText}>开始治疗</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { padding: 16, paddingBottom: 40 },

  /* Center layout */
  centerWrap: { flex: 1, backgroundColor: "#F5F7FA", alignItems: "center", justifyContent: "center", padding: 32 },
  completeTitle: { fontSize: 20, fontWeight: "700", color: "#333", marginTop: 16 },
  completeSubtitle: { fontSize: 14, color: "#666", marginTop: 8, marginBottom: 24 },
  diagnosingText: { fontSize: 15, color: "#666", marginTop: 16 },

  /* Diagnose button */
  diagnoseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#4A90D9",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  diagnoseBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  /* Summary */
  summaryCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryText: { flex: 1, fontSize: 14, color: "#333", lineHeight: 22 },

  /* Empty */
  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, color: "#999", marginTop: 12 },

  /* Pattern card */
  patternCard: {
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
  patternHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  patternTitle: { fontSize: 16, fontWeight: "600", color: "#333", flex: 1, marginRight: 8 },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  severityText: { fontSize: 12, fontWeight: "600" },
  patternDesc: { fontSize: 14, color: "#666", lineHeight: 22, marginBottom: 12 },
  patternFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  patternStatus: { fontSize: 13, color: "#999" },
  treatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#4A90D9",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  treatBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  /* Progress */
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  progressHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  backBtn: { marginRight: 10 },
  progressLabel: { fontSize: 14, fontWeight: "600", color: "#333" },
  progressBarBg: { height: 6, backgroundColor: "#E5E7EB", borderRadius: 3 },
  progressBarFill: { height: 6, backgroundColor: "#4A90D9", borderRadius: 3 },

  /* Exercise */
  exerciseCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  exerciseQuestion: { fontSize: 16, color: "#333", lineHeight: 24, fontWeight: "500", marginBottom: 16 },
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
    backgroundColor: "#4A90D9",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  /* Feedback */
  feedbackCard: { marginTop: 16, padding: 14, borderRadius: 12 },
  feedbackCorrect: { backgroundColor: "#F0FDF4" },
  feedbackWrong: { backgroundColor: "#FEF2F2" },
  feedbackHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  feedbackTitle: { fontSize: 16, fontWeight: "600" },
  feedbackExplanation: { fontSize: 14, color: "#333", lineHeight: 22, marginBottom: 8 },
});
