import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useExamStore } from "../../../stores/exam";

const PRIMARY = "#4A90D9";
const BG = "#F5F7FA";
const CARD_BG = "#fff";
const TEXT_PRIMARY = "#333";
const TEXT_SECONDARY = "#666";

type Phase = "intro" | "answering" | "result";

interface AnswerRecord {
  section: string;
  question: string;
  answer: string;
  knowledge_point_id: number | null;
}

export default function ExamDiagnosticScreen() {
  const router = useRouter();
  const {
    diagnosticQuestions,
    diagnosticResult,
    loading,
    startDiagnostic,
    submitDiagnostic,
  } = useExamStore();

  const [phase, setPhase] = useState<Phase>("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Move to answering phase once questions are loaded
  useEffect(() => {
    if (diagnosticQuestions.length > 0 && phase === "intro") {
      setPhase("answering");
      setCurrentIdx(0);
      setAnswers([]);
      setSelectedOption(null);
    }
  }, [diagnosticQuestions]);

  // Move to result phase once result is available
  useEffect(() => {
    if (diagnosticResult && phase === "answering") {
      setPhase("result");
    }
  }, [diagnosticResult]);

  const handleStart = async () => {
    try {
      await startDiagnostic();
    } catch (e: any) {
      Alert.alert("错误", e.message);
    }
  };

  const handleNext = () => {
    if (!selectedOption) return Alert.alert("提示", "请选择一个答案");

    const q = diagnosticQuestions[currentIdx];
    const newAnswers: AnswerRecord[] = [
      ...answers,
      {
        section: q.section,
        question: q.question,
        answer: selectedOption,
        knowledge_point_id: q.knowledge_point_id,
      },
    ];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentIdx < diagnosticQuestions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOption) return Alert.alert("提示", "请选择一个答案");

    const q = diagnosticQuestions[currentIdx];
    const finalAnswers: AnswerRecord[] = [
      ...answers,
      {
        section: q.section,
        question: q.question,
        answer: selectedOption,
        knowledge_point_id: q.knowledge_point_id,
      },
    ];

    setSubmitting(true);
    try {
      await submitDiagnostic(finalAnswers);
    } catch (e: any) {
      Alert.alert("错误", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isLastQuestion = currentIdx === diagnosticQuestions.length - 1;
  const currentQuestion = diagnosticQuestions[currentIdx];

  // ── Phase: Intro ──
  if (phase === "intro") {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.introIconWrap}>
            <Feather name="clipboard" size={48} color={PRIMARY} />
          </View>
          <Text style={styles.introTitle}>诊断测试</Text>
          <Text style={styles.introDesc}>
            诊断测试将评估你在各个考试板块的当前水平。系统会根据你的作答情况，
            自动调整题目难度，精准定位你的薄弱环节。
          </Text>
          <View style={styles.introTips}>
            <View style={styles.tipRow}>
              <Feather name="check-circle" size={16} color="#27AE60" />
              <Text style={styles.tipText}>覆盖听力、阅读、写作、语法等板块</Text>
            </View>
            <View style={styles.tipRow}>
              <Feather name="check-circle" size={16} color="#27AE60" />
              <Text style={styles.tipText}>自适应难度，精准评估水平</Text>
            </View>
            <View style={styles.tipRow}>
              <Feather name="check-circle" size={16} color="#27AE60" />
              <Text style={styles.tipText}>完成后生成 CEFR 等级和分项报告</Text>
            </View>
            <View style={styles.tipRow}>
              <Feather name="clock" size={16} color={TEXT_SECONDARY} />
              <Text style={styles.tipText}>预计用时 15-20 分钟</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
            onPress={handleStart}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>开始诊断</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── Phase: Answering ──
  if (phase === "answering" && currentQuestion) {
    return (
      <View style={styles.container}>
        {/* Progress bar */}
        <View style={styles.progressBarWrap}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${((currentIdx + 1) / diagnosticQuestions.length) * 100}%`,
              },
            ]}
          />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Question header */}
          <View style={styles.qHeader}>
            <Text style={styles.qSection}>{currentQuestion.section}</Text>
            <Text style={styles.qCounter}>
              {currentIdx + 1} / {diagnosticQuestions.length}
            </Text>
          </View>

          {/* Question card */}
          <View style={styles.card}>
            <Text style={styles.qDifficulty}>
              难度{" "}
              {Array.from({ length: 5 }, (_, i) => (
                <Feather
                  key={i}
                  name="star"
                  size={14}
                  color={i < currentQuestion.difficulty ? "#F5A623" : "#ddd"}
                />
              ))}
            </Text>
            <Text style={styles.qText}>{currentQuestion.question}</Text>

            {/* Options */}
            <View style={styles.optionsWrap}>
              {currentQuestion.options.map((opt, i) => {
                const label = String.fromCharCode(65 + i);
                const isSelected = selectedOption === opt;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.optionBtn, isSelected && styles.optionBtnActive]}
                    onPress={() => setSelectedOption(opt)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionLabelText,
                          isSelected && styles.optionLabelTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action button */}
          {isLastQuestion ? (
            <TouchableOpacity
              style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>提交</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
              <Text style={styles.primaryBtnText}>下一题</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Phase: Result ──
  if (phase === "result" && diagnosticResult) {
    const score = diagnosticResult.score as number | undefined;
    const cefrLevel = diagnosticResult.cefr_level as string | undefined;
    const sections = (diagnosticResult.sections as { section: string; label: string; score: number; total: number }[]) || [];

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.card, styles.resultHeader]}>
          <View style={styles.resultIconWrap}>
            <Feather name="award" size={48} color="#fff" />
          </View>
          <Text style={styles.resultTitle}>诊断完成</Text>
          {score != null && (
            <View style={styles.resultScoreWrap}>
              <Text style={styles.resultScore}>{score}</Text>
              <Text style={styles.resultScoreUnit}>分</Text>
            </View>
          )}
          {cefrLevel && (
            <View style={styles.cefrBadge}>
              <Text style={styles.cefrText}>CEFR {cefrLevel}</Text>
            </View>
          )}
        </View>

        {/* Section breakdown */}
        {sections.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>分项成绩</Text>
            {sections.map((s, i) => {
              const pct = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0;
              return (
                <View key={i} style={styles.breakdownItem}>
                  <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownLabel}>{s.label}</Text>
                    <Text style={styles.breakdownScore}>
                      {s.score}/{s.total}
                    </Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${pct}%`,
                          backgroundColor:
                            pct >= 80
                              ? "#27AE60"
                              : pct >= 60
                              ? "#F5A623"
                              : "#E74C3C",
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.primaryBtnText}>返回考试中心</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Fallback loading
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={PRIMARY} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BG,
  },

  // ── Card ──
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // ── Primary Button ──
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  // ── Intro Phase ──
  introIconWrap: { alignItems: "center", marginBottom: 16, marginTop: 8 },
  introTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    textAlign: "center",
    marginBottom: 12,
  },
  introDesc: {
    fontSize: 15,
    color: TEXT_SECONDARY,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 20,
  },
  introTips: { marginBottom: 8 },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  tipText: { fontSize: 14, color: TEXT_PRIMARY, marginLeft: 10, flex: 1 },

  // ── Progress Bar ──
  progressBarWrap: {
    height: 4,
    backgroundColor: "#E8EDF2",
  },
  progressBarFill: {
    height: 4,
    backgroundColor: PRIMARY,
  },

  // ── Question Phase ──
  qHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  qSection: {
    fontSize: 14,
    fontWeight: "600",
    color: PRIMARY,
    backgroundColor: "#EBF3FB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: "hidden",
  },
  qCounter: { fontSize: 14, color: TEXT_SECONDARY, fontWeight: "500" },
  qDifficulty: { fontSize: 13, color: TEXT_SECONDARY, marginBottom: 10 },
  qText: {
    fontSize: 16,
    fontWeight: "500",
    color: TEXT_PRIMARY,
    lineHeight: 26,
    marginBottom: 20,
  },

  // ── Options ──
  optionsWrap: { gap: 10 },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFBFC",
  },
  optionBtnActive: {
    borderColor: PRIMARY,
    backgroundColor: "#EBF3FB",
  },
  optionLabel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E8EDF2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionLabelActive: { backgroundColor: PRIMARY },
  optionLabelText: { fontSize: 14, fontWeight: "600", color: TEXT_SECONDARY },
  optionLabelTextActive: { color: "#fff" },
  optionText: { fontSize: 15, color: TEXT_PRIMARY, flex: 1 },
  optionTextActive: { color: PRIMARY, fontWeight: "500" },

  // ── Result Phase ──
  resultHeader: {
    backgroundColor: PRIMARY,
    alignItems: "center",
    paddingVertical: 28,
  },
  resultIconWrap: { marginBottom: 12 },
  resultTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  resultScoreWrap: { flexDirection: "row", alignItems: "baseline" },
  resultScore: { fontSize: 52, fontWeight: "800", color: "#fff" },
  resultScoreUnit: {
    fontSize: 18,
    color: "#fff",
    opacity: 0.85,
    marginLeft: 4,
  },
  cefrBadge: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  cefrText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  // ── Section Breakdown ──
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 14,
  },
  breakdownItem: { marginBottom: 14 },
  breakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  breakdownLabel: { fontSize: 14, fontWeight: "500", color: TEXT_PRIMARY },
  breakdownScore: { fontSize: 14, fontWeight: "600", color: TEXT_SECONDARY },
  progressBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E8EDF2",
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
});
