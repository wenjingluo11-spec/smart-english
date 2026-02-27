import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useExamStore } from "../../../stores/exam";
import AudioPlayer from "../../../components/cognitive/AudioPlayer";

const PRIMARY = "#4A90D9";
const BG = "#F5F7FA";
const CARD = "#fff";
const TEXT_PRIMARY = "#333";
const TEXT_SECONDARY = "#666";

type FlowPhase = "idle" | "playing" | "report";

export default function ExamFlowScreen() {
  const router = useRouter();
  const {
    flowQuestions,
    loading,
    startFlow,
    submitFlow,
    endFlow,
  } = useExamStore();

  const [phase, setPhase] = useState<FlowPhase>("idle");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  const flashAnim = useRef(new Animated.Value(0)).current;

  const triggerFlash = useCallback(
    (correct: boolean) => {
      setFlashColor(correct ? "#4CAF50" : "#F44336");
      flashAnim.setValue(1);
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }).start();
    },
    [flashAnim]
  );

  const handleStart = useCallback(async () => {
    await startFlow();
    setPhase("playing");
    setCurrentIndex(0);
    setStreak(0);
    setCorrectCount(0);
    setTotalAnswered(0);
    setSelectedOption(null);
  }, [startFlow]);

  const handleSubmit = useCallback(async () => {
    if (!selectedOption || submitting) return;
    const question = flowQuestions[currentIndex];
    if (!question) return;
    setSubmitting(true);
    try {
      const res = await submitFlow(question.id, selectedOption);
      const isCorrect = !!res.is_correct;
      triggerFlash(isCorrect);
      setTotalAnswered((n) => n + 1);
      if (isCorrect) {
        setCorrectCount((n) => n + 1);
        setStreak((n) => n + 1);
      } else {
        setStreak(0);
      }
      // Auto-advance after brief delay
      setTimeout(() => {
        if (currentIndex + 1 < flowQuestions.length) {
          setCurrentIndex((i) => i + 1);
          setSelectedOption(null);
        } else {
          handleEnd();
        }
      }, 600);
    } catch {
      /* ignore */
    }
    setSubmitting(false);
  }, [selectedOption, submitting, flowQuestions, currentIndex, submitFlow, triggerFlash]);

  const handleEnd = useCallback(async () => {
    try {
      const res = await endFlow();
      setReport(res);
    } catch {
      setReport({ streak, correctCount, totalAnswered });
    }
    setPhase("report");
  }, [endFlow, streak, correctCount, totalAnswered]);

  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  const flashBg = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0,0,0,0)", flashColor === "#4CAF50" ? "rgba(76,175,80,0.15)" : "rgba(244,67,54,0.15)"],
  });

  // Loading
  if (loading && phase === "idle") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  // Idle: start screen
  if (phase === "idle") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Flow 刷题</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.idleContainer}>
          <View style={styles.idleCard}>
            <Feather name="zap" size={56} color={PRIMARY} />
            <Text style={styles.idleTitle}>Flow 模式</Text>
            <Text style={styles.idleDesc}>
              连续答题，不间断挑战。{"\n"}保持手感，提升速度与准确率。
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.8}>
              <Feather name="play" size={20} color="#fff" />
              <Text style={styles.startBtnText}>开始刷题</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Report screen
  if (phase === "report") {
    const rStreak = (report?.max_streak as number) ?? streak;
    const rCorrect = (report?.correct_count as number) ?? correctCount;
    const rTotal = (report?.total_answered as number) ?? totalAnswered;
    const rAccuracy = rTotal > 0 ? Math.round((rCorrect / rTotal) * 100) : 0;
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>刷题报告</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={styles.reportContainer}>
          <View style={styles.reportCard}>
            <Feather name="bar-chart-2" size={48} color={PRIMARY} />
            <Text style={styles.reportTitle}>本次刷题报告</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{rTotal}</Text>
                <Text style={styles.statLabel}>总题数</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: "#4CAF50" }]}>{rCorrect}</Text>
                <Text style={styles.statLabel}>正确</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: PRIMARY }]}>{rAccuracy}%</Text>
                <Text style={styles.statLabel}>正确率</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: "#FF9800" }]}>{rStreak}</Text>
                <Text style={styles.statLabel}>最高连击</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => {
              setPhase("idle");
              setReport(null);
            }}
            activeOpacity={0.8}
          >
            <Feather name="refresh-cw" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>再来一轮</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>返回</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Playing phase
  const question = flowQuestions[currentIndex];
  if (!question) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>暂无题目</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { backgroundColor: flashBg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Flow 刷题</Text>
        <TouchableOpacity onPress={handleEnd} style={styles.endBtn}>
          <Text style={styles.endBtnText}>结束</Text>
        </TouchableOpacity>
      </View>

      {/* Real-time stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statsBarItem}>
          <Feather name="zap" size={14} color="#FF9800" />
          <Text style={styles.statsBarValue}>{streak}</Text>
          <Text style={styles.statsBarLabel}>连击</Text>
        </View>
        <View style={styles.statsBarItem}>
          <Feather name="target" size={14} color="#4CAF50" />
          <Text style={styles.statsBarValue}>{accuracy}%</Text>
          <Text style={styles.statsBarLabel}>正确率</Text>
        </View>
        <View style={styles.statsBarItem}>
          <Feather name="check-circle" size={14} color={PRIMARY} />
          <Text style={styles.statsBarValue}>{totalAnswered}</Text>
          <Text style={styles.statsBarLabel}>已答</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.questionContainer}>
        {/* Progress */}
        <Text style={styles.progressText}>
          第 {currentIndex + 1} / {flowQuestions.length} 题
        </Text>

        {/* Question card */}
        <View style={styles.questionCard}>
          <Text style={styles.questionContent}>{question.content}</Text>
          <View style={{ marginTop: 8 }}>
            <AudioPlayer text={question.content} compact label="听题" />
          </View>
        </View>

        {/* Options */}
        {question.options.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isSelected = selectedOption === opt;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.optionBtn, isSelected && styles.optionSelected]}
              onPress={() => !submitting && setSelectedOption(opt)}
              activeOpacity={0.7}
              disabled={submitting}
            >
              <View style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                <Text style={[styles.optionLetterText, isSelected && { color: "#fff" }]}>
                  {letter}
                </Text>
              </View>
              <Text style={[styles.optionText, isSelected && { color: PRIMARY }]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (!selectedOption || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selectedOption || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>提交</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },
  emptyText: { color: TEXT_SECONDARY, fontSize: 15 },
  header: {
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
  headerTitle: { fontSize: 17, fontWeight: "700", color: TEXT_PRIMARY },
  endBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#F44336",
    borderRadius: 8,
  },
  endBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  // Stats bar
  statsBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: CARD,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  statsBarItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statsBarValue: { fontSize: 15, fontWeight: "700", color: TEXT_PRIMARY },
  statsBarLabel: { fontSize: 12, color: TEXT_SECONDARY },

  // Idle
  idleContainer: { flex: 1, justifyContent: "center", padding: 24 },
  idleCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  idleTitle: { fontSize: 22, fontWeight: "700", color: TEXT_PRIMARY, marginTop: 16 },
  idleDesc: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 8,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  startBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Question area
  questionContainer: { padding: 20, paddingBottom: 40 },
  progressText: { fontSize: 13, color: TEXT_SECONDARY, textAlign: "center", marginBottom: 12 },
  questionCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  questionContent: { fontSize: 16, color: TEXT_PRIMARY, lineHeight: 24 },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  optionSelected: { borderColor: PRIMARY, backgroundColor: "#EBF3FB" },
  optionLetter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionLetterSelected: { backgroundColor: PRIMARY },
  optionLetterText: { fontSize: 14, fontWeight: "700", color: TEXT_SECONDARY },
  optionText: { flex: 1, fontSize: 15, color: TEXT_PRIMARY, lineHeight: 22 },
  submitBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Report
  reportContainer: { padding: 24, paddingTop: 40, alignItems: "center" },
  reportCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  reportTitle: { fontSize: 20, fontWeight: "700", color: TEXT_PRIMARY, marginTop: 12, marginBottom: 20 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  statItem: { alignItems: "center", flex: 1 },
  statValue: { fontSize: 24, fontWeight: "700", color: TEXT_PRIMARY },
  statLabel: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 4 },
  statDivider: { width: 1, height: 32, backgroundColor: "#E5E7EB" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 14,
    width: "100%",
    marginTop: 24,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 14,
    width: "100%",
    marginTop: 10,
  },
  secondaryBtnText: { color: TEXT_SECONDARY, fontSize: 15 },
});
