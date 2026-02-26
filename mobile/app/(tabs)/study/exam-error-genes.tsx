import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useExamStore } from "../../../stores/exam";
import type { ErrorGene } from "../../../lib/types";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PRIMARY = "#4A90D9";
const BG = "#F5F7FA";
const CARD = "#fff";
const TEXT_PRIMARY = "#333";
const TEXT_SECONDARY = "#666";

const SEVERITY_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  high: { label: "高频", bg: "#FEE2E2", color: "#DC2626" },
  medium: { label: "中频", bg: "#FEF3C7", color: "#D97706" },
  low: { label: "低频", bg: "#DCFCE7", color: "#16A34A" },
};

interface ExerciseFeedback {
  [key: string]: { submitted: boolean; answer: string; result: Record<string, unknown> | null };
}

export default function ExamErrorGenesScreen() {
  const router = useRouter();
  const { errorGenes, loading, fetchErrorGenes, submitGeneFix } = useExamStore();

  const [expandedGene, setExpandedGene] = useState<string | null>(null);
  const [exerciseSelections, setExerciseSelections] = useState<Record<string, string>>({});
  const [exerciseFeedback, setExerciseFeedback] = useState<ExerciseFeedback>({});
  const [submittingKey, setSubmittingKey] = useState<string | null>(null);

  useEffect(() => {
    fetchErrorGenes();
  }, []);

  const toggleGene = useCallback((geneId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedGene((prev) => (prev === geneId ? null : geneId));
  }, []);

  const handleSelectOption = useCallback((key: string, option: string) => {
    setExerciseSelections((prev) => ({ ...prev, [key]: option }));
  }, []);

  const handleSubmitExercise = useCallback(
    async (geneId: string, exerciseIndex: number) => {
      const key = `${geneId}_${exerciseIndex}`;
      const answer = exerciseSelections[key];
      if (!answer || submittingKey) return;
      setSubmittingKey(key);
      try {
        const res = await submitGeneFix(geneId, exerciseIndex, answer);
        setExerciseFeedback((prev) => ({
          ...prev,
          [key]: { submitted: true, answer, result: res },
        }));
      } catch {
        /* ignore */
      }
      setSubmittingKey(null);
    },
    [exerciseSelections, submittingKey, submitGeneFix]
  );

  const getSeverity = (severity: string) => {
    return SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.medium;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  const renderExercise = (gene: ErrorGene, exercise: ErrorGene["fix_exercises"][0], index: number) => {
    const key = `${gene.gene_id}_${index}`;
    const selected = exerciseSelections[key] || null;
    const fb = exerciseFeedback[key];
    const isSubmitting = submittingKey === key;

    return (
      <View key={key} style={styles.exerciseCard}>
        <Text style={styles.exerciseLabel}>练习 {index + 1}</Text>
        <Text style={styles.exerciseQuestion}>{exercise.question}</Text>
        {exercise.options?.map((opt, oi) => {
          const letter = String.fromCharCode(65 + oi);
          const isSelected = selected === letter;
          let optStyle = styles.optionDefault;
          let optTextStyle = styles.optionTextDefault;

          if (fb?.submitted) {
            if (letter === exercise.answer) {
              optStyle = styles.optionCorrect;
              optTextStyle = styles.optionTextCorrect;
            } else if (isSelected && letter !== exercise.answer) {
              optStyle = styles.optionWrong;
              optTextStyle = styles.optionTextWrong;
            }
          } else if (isSelected) {
            optStyle = styles.optionSelected;
            optTextStyle = styles.optionTextSelected;
          }

          return (
            <TouchableOpacity
              key={oi}
              style={[styles.optionBtn, optStyle]}
              onPress={() => !fb?.submitted && handleSelectOption(key, letter)}
              disabled={!!fb?.submitted}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionLetter, optTextStyle]}>{letter}</Text>
              <Text style={[styles.optionText, optTextStyle]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}

        {!fb?.submitted ? (
          <TouchableOpacity
            style={[styles.submitBtn, (!selected || isSubmitting) && styles.submitBtnDisabled]}
            onPress={() => handleSubmitExercise(gene.gene_id, index)}
            disabled={!selected || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>提交</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={[styles.feedbackCard, fb.result?.is_correct ? styles.feedbackCorrect : styles.feedbackWrong]}>
            <View style={styles.feedbackHeader}>
              <Feather
                name={fb.result?.is_correct ? "check-circle" : "x-circle"}
                size={16}
                color={fb.result?.is_correct ? "#4CAF50" : "#F44336"}
              />
              <Text
                style={[
                  styles.feedbackTitle,
                  { color: fb.result?.is_correct ? "#4CAF50" : "#F44336" },
                ]}
              >
                {fb.result?.is_correct ? "正确" : "错误"}
              </Text>
            </View>
            {exercise.explanation ? (
              <Text style={styles.feedbackExplanation}>{exercise.explanation}</Text>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  const renderGene = ({ item }: { item: ErrorGene }) => {
    const severity = getSeverity(item.severity);
    const isExpanded = expandedGene === item.gene_id;

    return (
      <View style={styles.geneCard}>
        <TouchableOpacity
          style={styles.geneHeader}
          onPress={() => toggleGene(item.gene_id)}
          activeOpacity={0.7}
        >
          <View style={styles.geneInfo}>
            <View style={styles.geneTopRow}>
              <Text style={styles.geneName}>{item.gene_name}</Text>
              <View style={[styles.severityBadge, { backgroundColor: severity.bg }]}>
                <Text style={[styles.severityText, { color: severity.color }]}>
                  {severity.label}
                </Text>
              </View>
            </View>
            <Text style={styles.geneDesc} numberOfLines={isExpanded ? undefined : 2}>
              {item.description}
            </Text>
            <View style={styles.geneMetaRow}>
              <Feather name="repeat" size={13} color={TEXT_SECONDARY} />
              <Text style={styles.geneMetaText}>出现 {item.frequency} 次</Text>
              {item.fix_exercises?.length > 0 && (
                <>
                  <Feather name="edit-3" size={13} color={TEXT_SECONDARY} style={{ marginLeft: 12 }} />
                  <Text style={styles.geneMetaText}>{item.fix_exercises.length} 道练习</Text>
                </>
              )}
            </View>
          </View>
          <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#ccc" />
        </TouchableOpacity>

        {isExpanded && item.fix_exercises?.length > 0 && (
          <View style={styles.exercisesContainer}>
            {item.fix_exercises.map((ex, i) => renderExercise(item, ex, i))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>错误基因分析</Text>
        <View style={{ width: 36 }} />
      </View>
      <FlatList
        data={errorGenes}
        keyExtractor={(item) => item.gene_id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.center}>
            <Feather name="check-circle" size={40} color="#ccc" />
            <Text style={styles.emptyText}>暂无错误基因数据</Text>
          </View>
        }
        renderItem={renderGene}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { color: "#999", fontSize: 15, marginTop: 12 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: CARD,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: TEXT_PRIMARY },
  listContent: { padding: 16, paddingBottom: 40 },
  geneCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },
  geneHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  geneInfo: { flex: 1 },
  geneTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  geneName: { fontSize: 16, fontWeight: "600", color: TEXT_PRIMARY },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  severityText: { fontSize: 12, fontWeight: "600" },
  geneDesc: { fontSize: 14, color: TEXT_SECONDARY, lineHeight: 20 },
  geneMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  geneMetaText: { fontSize: 13, color: TEXT_SECONDARY },
  exercisesContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    padding: 16,
    paddingTop: 12,
    gap: 16,
  },
  exerciseCard: {
    backgroundColor: BG,
    borderRadius: 12,
    padding: 14,
  },
  exerciseLabel: { fontSize: 12, fontWeight: "600", color: PRIMARY, marginBottom: 6 },
  exerciseQuestion: { fontSize: 15, color: TEXT_PRIMARY, lineHeight: 22, marginBottom: 10 },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
  },
  optionDefault: { backgroundColor: CARD, borderColor: "#E5E7EB" },
  optionSelected: { backgroundColor: "#EBF5FF", borderColor: PRIMARY },
  optionCorrect: { backgroundColor: "#F0FDF4", borderColor: "#4CAF50" },
  optionWrong: { backgroundColor: "#FEF2F2", borderColor: "#F44336" },
  optionLetter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BG,
    textAlign: "center",
    lineHeight: 24,
    fontSize: 13,
    fontWeight: "600",
    color: TEXT_SECONDARY,
    marginRight: 10,
    overflow: "hidden",
  },
  optionText: { flex: 1, fontSize: 14, lineHeight: 20 },
  optionTextDefault: { color: TEXT_PRIMARY },
  optionTextSelected: { color: PRIMARY },
  optionTextCorrect: { color: "#16A34A" },
  optionTextWrong: { color: "#DC2626" },
  submitBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  feedbackCard: {
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  feedbackCorrect: { backgroundColor: "#F0FDF4" },
  feedbackWrong: { backgroundColor: "#FEF2F2" },
  feedbackHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  feedbackTitle: { fontSize: 14, fontWeight: "600" },
  feedbackExplanation: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 19 },
});
