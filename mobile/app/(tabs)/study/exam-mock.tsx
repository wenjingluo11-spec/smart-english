import { useState, useEffect, useRef, useCallback } from "react";
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

type Phase = "start" | "exam" | "result";

export default function ExamMockScreen() {
  const router = useRouter();
  const {
    mockData,
    mockResult,
    loading,
    startMock,
    submitMock,
  } = useExamStore();

  const [phase, setPhase] = useState<Phase>("start");
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start the mock exam
  const handleStart = useCallback(async () => {
    await startMock();
  }, [startMock]);

  // Transition to exam phase when mockData arrives
  useEffect(() => {
    if (mockData && phase === "start") {
      setPhase("exam");
      setActiveSectionIdx(0);
      setQuestionIdx(0);
      setAnswers({});
      setTimeLeft(mockData.time_limit_minutes * 60);
      startTimeRef.current = Date.now();
    }
  }, [mockData]);

  // Transition to result phase when mockResult arrives
  useEffect(() => {
    if (mockResult && phase === "exam") {
      setPhase("result");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [mockResult]);

  // Countdown timer
  useEffect(() => {
    if (phase !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Current section and question helpers
  const activeSection = mockData?.sections[activeSectionIdx];
  const allSectionQuestions = activeSection?.questions ?? [];
  const currentQuestion = allSectionQuestions[questionIdx];

  const totalQuestions = mockData?.sections.reduce(
    (sum, s) => sum + s.questions.length,
    0
  ) ?? 0;
  const answeredCount = Object.keys(answers).length;

  const selectAnswer = (questionId: number, option: string) => {
    setAnswers((prev) => ({ ...prev, [String(questionId)]: option }));
  };

  // Navigation
  const goNextQuestion = () => {
    if (questionIdx < allSectionQuestions.length - 1) {
      setQuestionIdx(questionIdx + 1);
    } else if (activeSectionIdx < (mockData?.sections.length ?? 1) - 1) {
      setActiveSectionIdx(activeSectionIdx + 1);
      setQuestionIdx(0);
    }
  };

  const goPrevQuestion = () => {
    if (questionIdx > 0) {
      setQuestionIdx(questionIdx - 1);
    } else if (activeSectionIdx > 0) {
      const prevSection = mockData!.sections[activeSectionIdx - 1];
      setActiveSectionIdx(activeSectionIdx - 1);
      setQuestionIdx(prevSection.questions.length - 1);
    }
  };

  const jumpToSection = (idx: number) => {
    setActiveSectionIdx(idx);
    setQuestionIdx(0);
  };

  // Submit
  const handleSubmit = useCallback(() => {
    if (!mockData) return;
    const timeUsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    Alert.alert("确认交卷", `已答 ${answeredCount}/${totalQuestions} 题，确认提交？`, [
      { text: "取消", style: "cancel" },
      {
        text: "确认",
        onPress: () => submitMock(mockData.mock_id, answers, timeUsed),
      },
    ]);
  }, [mockData, answers, answeredCount, totalQuestions, submitMock]);

  // ── Phase: Start ──
  if (phase === "start") {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.centerContent}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Feather name="file-text" size={32} color="#4A90D9" />
          </View>
          <Text style={styles.startTitle}>全真模考</Text>
          <Text style={styles.startDesc}>
            模拟真实考试环境，限时作答，完成后获得详细成绩分析。
          </Text>
          <View style={styles.infoRow}>
            <Feather name="clock" size={16} color="#666" />
            <Text style={styles.infoText}>限时答题，自动计时</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="layers" size={16} color="#666" />
            <Text style={styles.infoText}>涵盖所有考试题型</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="bar-chart-2" size={16} color="#666" />
            <Text style={styles.infoText}>交卷后即时出分</Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
            onPress={handleStart}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>开始模考</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ── Phase: Result ──
  if (phase === "result" && mockResult) {
    const totalScore = mockResult.total_score as number | undefined;
    const sectionScores = mockResult.section_scores as
      | { section: string; label: string; score: number; total: number }[]
      | undefined;

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.resultContent}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Feather name="award" size={32} color="#4A90D9" />
          </View>
          <Text style={styles.resultLabel}>模考成绩</Text>
          <Text style={styles.resultScore}>
            {totalScore ?? "--"}
          </Text>
          <Text style={styles.resultUnit}>分</Text>
        </View>

        {sectionScores && sectionScores.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionScoreTitle}>各部分得分</Text>
            {sectionScores.map((s, i) => (
              <View key={i} style={styles.sectionScoreRow}>
                <Text style={styles.sectionScoreLabel}>{s.label}</Text>
                <Text style={styles.sectionScoreValue}>
                  {s.score} / {s.total}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.primaryBtnText}>返回</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Phase: Exam ──
  if (!mockData || !activeSection || !currentQuestion) {
    return (
      <View style={styles.centerFull}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  const isFirst = activeSectionIdx === 0 && questionIdx === 0;
  const isLast =
    activeSectionIdx === mockData.sections.length - 1 &&
    questionIdx === allSectionQuestions.length - 1;
  const selectedAnswer = answers[String(currentQuestion.id)];

  // Compute global question number
  let globalIdx = questionIdx + 1;
  for (let i = 0; i < activeSectionIdx; i++) {
    globalIdx += mockData.sections[i].questions.length;
  }

  return (
    <View style={styles.container}>
      {/* Timer bar */}
      <View style={styles.timerBar}>
        <View style={styles.timerLeft}>
          <Feather name="clock" size={16} color={timeLeft < 60 ? "#EF4444" : "#4A90D9"} />
          <Text
            style={[
              styles.timerText,
              timeLeft < 60 && { color: "#EF4444" },
            ]}
          >
            {formatTime(timeLeft)}
          </Text>
        </View>
        <Text style={styles.progressText}>
          {answeredCount}/{totalQuestions} 已答
        </Text>
        <TouchableOpacity onPress={handleSubmit} activeOpacity={0.7}>
          <Text style={styles.submitLink}>交卷</Text>
        </TouchableOpacity>
      </View>

      {/* Section tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sectionTabsWrap}
        contentContainerStyle={styles.sectionTabs}
      >
        {mockData.sections.map((sec, idx) => {
          const isActive = idx === activeSectionIdx;
          return (
            <TouchableOpacity
              key={sec.section}
              style={[styles.sectionTab, isActive && styles.sectionTabActive]}
              onPress={() => jumpToSection(idx)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  isActive && styles.sectionTabTextActive,
                ]}
              >
                {sec.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Question */}
      <ScrollView
        style={styles.questionScroll}
        contentContainerStyle={styles.questionContent}
      >
        <Text style={styles.questionNumber}>
          第 {globalIdx} 题 / 共 {totalQuestions} 题
        </Text>

        {currentQuestion.passage_text && (
          <View style={styles.passageCard}>
            <Text style={styles.passageText}>{currentQuestion.passage_text}</Text>
          </View>
        )}

        <Text style={styles.questionText}>{currentQuestion.content}</Text>

        <View style={styles.optionsWrap}>
          {currentQuestion.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = selectedAnswer === letter;
            return (
              <TouchableOpacity
                key={i}
                style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
                onPress={() => selectAnswer(currentQuestion.id, letter)}
                activeOpacity={0.7}
              >
                <View style={[styles.optionLetter, isSelected && styles.optionLetterSelected]}>
                  <Text
                    style={[
                      styles.optionLetterText,
                      isSelected && styles.optionLetterTextSelected,
                    ]}
                  >
                    {letter}
                  </Text>
                </View>
                <Text
                  style={[styles.optionText, isSelected && styles.optionTextSelected]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navBtn, isFirst && styles.navBtnDisabled]}
          onPress={goPrevQuestion}
          disabled={isFirst}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={20} color={isFirst ? "#ccc" : "#4A90D9"} />
          <Text style={[styles.navBtnText, isFirst && { color: "#ccc" }]}>上一题</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, isLast && styles.navBtnDisabled]}
          onPress={goNextQuestion}
          disabled={isLast}
          activeOpacity={0.7}
        >
          <Text style={[styles.navBtnText, isLast && { color: "#ccc" }]}>下一题</Text>
          <Feather name="chevron-right" size={20} color={isLast ? "#ccc" : "#4A90D9"} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  centerContent: { flexGrow: 1, justifyContent: "center", padding: 20 },
  centerFull: { flex: 1, alignItems: "center", justifyContent: "center" },
  resultContent: { padding: 20, gap: 16 },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EBF2FB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  // Start phase
  startTitle: { fontSize: 22, fontWeight: "700", color: "#333", marginBottom: 8 },
  startDesc: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 22, marginBottom: 20 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  infoText: { fontSize: 14, color: "#666" },

  // Primary button
  primaryBtn: {
    backgroundColor: "#4A90D9",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: "center",
    marginTop: 20,
    alignSelf: "center",
    width: "100%",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  // Timer bar
  timerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  timerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  timerText: { fontSize: 16, fontWeight: "700", color: "#4A90D9" },
  progressText: { fontSize: 13, color: "#666" },
  submitLink: { fontSize: 14, fontWeight: "600", color: "#EF4444" },

  // Section tabs
  sectionTabsWrap: { maxHeight: 48, backgroundColor: "#fff" },
  sectionTabs: { paddingHorizontal: 12, gap: 8, alignItems: "center", height: 48 },
  sectionTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
  },
  sectionTabActive: { backgroundColor: "#4A90D9" },
  sectionTabText: { fontSize: 13, color: "#666", fontWeight: "500" },
  sectionTabTextActive: { color: "#fff" },

  // Question area
  questionScroll: { flex: 1 },
  questionContent: { padding: 20 },
  questionNumber: { fontSize: 13, color: "#666", marginBottom: 12 },
  passageCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  passageText: { fontSize: 14, color: "#333", lineHeight: 24 },
  questionText: { fontSize: 16, fontWeight: "600", color: "#333", lineHeight: 26, marginBottom: 20 },

  // Options
  optionsWrap: { gap: 10 },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  optionBtnSelected: { borderColor: "#4A90D9", backgroundColor: "#EBF2FB" },
  optionLetter: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionLetterSelected: { backgroundColor: "#4A90D9" },
  optionLetterText: { fontSize: 14, fontWeight: "600", color: "#666" },
  optionLetterTextSelected: { color: "#fff" },
  optionText: { flex: 1, fontSize: 15, color: "#333", lineHeight: 22 },
  optionTextSelected: { color: "#4A90D9", fontWeight: "500" },

  // Navigation bar
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  navBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { fontSize: 15, color: "#4A90D9", fontWeight: "500" },

  // Result phase
  resultLabel: { fontSize: 16, color: "#666", marginBottom: 4 },
  resultScore: { fontSize: 48, fontWeight: "700", color: "#4A90D9" },
  resultUnit: { fontSize: 16, color: "#666", marginTop: -4 },
  sectionScoreTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  sectionScoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  sectionScoreLabel: { fontSize: 15, color: "#333" },
  sectionScoreValue: { fontSize: 15, fontWeight: "600", color: "#4A90D9" },
});
