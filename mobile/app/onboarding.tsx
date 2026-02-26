import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useOnboardingStore } from "../stores/onboarding";
import { api } from "../lib/api";

type Step = "welcome" | "assessment" | "result";

interface AssessmentQuestion {
  id: number;
  content: string;
  options: string[];
}

interface AssessmentResult {
  score: number;
  cefr_level: string;
  recommended_path: string;
  summary: string;
}

const FEATURES = [
  { icon: "book-open" as const, title: "智能阅读", desc: "AI 精选分级阅读材料，匹配你的水平" },
  { icon: "edit-3" as const, title: "写作批改", desc: "AI 实时批改作文，精准提升写作能力" },
  { icon: "mic" as const, title: "口语对话", desc: "与 AI 外教自由对话，练习地道表达" },
  { icon: "target" as const, title: "考试冲刺", desc: "真题训练 + 薄弱点诊断，高效备考" },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { fetchStatus } = useOnboardingStore();

  const [step, setStep] = useState<Step>("welcome");
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selectedOption, setSelectedOption] = useState("");
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const startAssessment = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.post<{ questions: AssessmentQuestion[] }>(
        "/onboarding/start-assessment",
        {}
      );
      setQuestions(data.questions);
      setQuestionIdx(0);
      setAnswers({});
      setSelectedOption("");
      setStep("assessment");
    } catch (e: any) {
      Alert.alert("错误", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmAnswer = useCallback(() => {
    if (!selectedOption) return;
    const currentQ = questions[questionIdx];
    const newAnswers = { ...answers, [currentQ.id]: selectedOption };
    setAnswers(newAnswers);

    if (questionIdx < questions.length - 1) {
      setQuestionIdx(questionIdx + 1);
      setSelectedOption("");
    } else {
      submitAssessment(newAnswers);
    }
  }, [selectedOption, questions, questionIdx, answers]);

  const submitAssessment = useCallback(
    async (finalAnswers: Record<number, string>) => {
      setSubmitting(true);
      try {
        const formatted = Object.entries(finalAnswers).map(([qId, answer]) => ({
          question_id: Number(qId),
          answer,
        }));
        const data = await api.post<AssessmentResult>("/onboarding/submit-assessment", {
          answers: formatted,
        });
        setAssessmentResult(data);
        setStep("result");
        await fetchStatus();
      } catch (e: any) {
        Alert.alert("提交失败", e.message);
      } finally {
        setSubmitting(false);
      }
    },
    [fetchStatus]
  );

  const handleFinish = useCallback(() => {
    router.replace("/");
  }, [router]);

  // ── Step indicator ──
  function renderStepDots() {
    const steps: Step[] = ["welcome", "assessment", "result"];
    const currentIndex = steps.indexOf(step);
    return (
      <View style={styles.dotsContainer}>
        {steps.map((s, i) => (
          <View
            key={s}
            style={[
              styles.dot,
              i <= currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    );
  }

  // ── Welcome step ──
  function renderWelcome() {
    return (
      <View style={styles.stepContainer}>
        <View style={styles.welcomeIconWrap}>
          <Feather name="globe" size={48} color="#4A90D9" />
        </View>
        <Text style={styles.welcomeTitle}>欢迎来到 Smart English</Text>
        <Text style={styles.welcomeSubtitle}>
          AI 驱动的个性化英语学习平台，为你量身定制学习路径
        </Text>

        <View style={styles.featuresContainer}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Feather name={f.icon} size={22} color="#4A90D9" />
              </View>
              <View style={styles.featureTextWrap}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
          onPress={startAssessment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>开始水平测试</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // ── Assessment step ──
  function renderAssessment() {
    if (submitting) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4A90D9" />
          <Text style={styles.loadingText}>正在评估你的水平...</Text>
        </View>
      );
    }

    const q = questions[questionIdx];
    if (!q) return null;

    return (
      <View style={styles.stepContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>水平测试</Text>
          <Text style={styles.progressCount}>
            {questionIdx + 1} / {questions.length}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${((questionIdx + 1) / questions.length) * 100}%` },
            ]}
          />
        </View>

        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{q.content}</Text>

          <View style={styles.optionsContainer}>
            {q.options.map((opt, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.optionBtn,
                  selectedOption === opt && styles.optionBtnActive,
                ]}
                onPress={() => setSelectedOption(opt)}
              >
                <View style={styles.optionRow}>
                  <View
                    style={[
                      styles.optionRadio,
                      selectedOption === opt && styles.optionRadioActive,
                    ]}
                  >
                    {selectedOption === opt && <View style={styles.optionRadioDot} />}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      selectedOption === opt && styles.optionTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, !selectedOption && { opacity: 0.4 }]}
            onPress={confirmAnswer}
            disabled={!selectedOption}
          >
            <Text style={styles.primaryBtnText}>
              {questionIdx < questions.length - 1 ? "下一题" : "提交测试"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Result step ──
  function renderResult() {
    if (!assessmentResult) return null;

    return (
      <View style={styles.stepContainer}>
        <View style={styles.resultIconWrap}>
          <Feather name="award" size={48} color="#4A90D9" />
        </View>
        <Text style={styles.resultTitle}>测试完成</Text>
        <Text style={styles.resultSubtitle}>{assessmentResult.summary}</Text>

        <View style={styles.resultCardsRow}>
          <View style={styles.resultStatCard}>
            <Text style={styles.resultStatValue}>{assessmentResult.score}</Text>
            <Text style={styles.resultStatLabel}>测试得分</Text>
          </View>
          <View style={styles.resultStatCard}>
            <Text style={styles.resultStatValue}>{assessmentResult.cefr_level}</Text>
            <Text style={styles.resultStatLabel}>CEFR 等级</Text>
          </View>
        </View>

        <View style={styles.pathCard}>
          <View style={styles.pathHeader}>
            <Feather name="map" size={18} color="#4A90D9" />
            <Text style={styles.pathTitle}>推荐学习路径</Text>
          </View>
          <Text style={styles.pathText}>{assessmentResult.recommended_path}</Text>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleFinish}>
          <Text style={styles.primaryBtnText}>开始学习</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {renderStepDots()}
      {step === "welcome" && renderWelcome()}
      {step === "assessment" && renderAssessment()}
      {step === "result" && renderResult()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  contentContainer: { paddingBottom: 40 },

  /* Step dots */
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingTop: 60,
    paddingBottom: 24,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotActive: { backgroundColor: "#4A90D9" },
  dotInactive: { backgroundColor: "#D1D5DB" },

  /* Step container */
  stepContainer: { paddingHorizontal: 24 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 120,
  },
  loadingText: { fontSize: 15, color: "#666", marginTop: 16 },

  /* Welcome */
  welcomeIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#EBF3FC",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },

  /* Features */
  featuresContainer: { gap: 12, marginBottom: 32 },
  featureCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    alignItems: "center",
    gap: 14,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EBF3FC",
    justifyContent: "center",
    alignItems: "center",
  },
  featureTextWrap: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 3 },
  featureDesc: { fontSize: 13, color: "#666", lineHeight: 18 },

  /* Primary button */
  primaryBtn: {
    backgroundColor: "#4A90D9",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  /* Assessment */
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progressLabel: { fontSize: 16, fontWeight: "600", color: "#333" },
  progressCount: { fontSize: 14, color: "#666" },
  progressBarBg: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    marginBottom: 24,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    backgroundColor: "#4A90D9",
    borderRadius: 3,
  },

  /* Question card */
  questionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  questionText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 26,
    fontWeight: "500",
    marginBottom: 20,
  },

  /* Options */
  optionsContainer: { gap: 10, marginBottom: 20 },
  optionBtn: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
  },
  optionBtnActive: { borderColor: "#4A90D9", backgroundColor: "#EBF3FC" },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  optionRadioActive: { borderColor: "#4A90D9" },
  optionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4A90D9",
  },
  optionText: { fontSize: 15, color: "#333", flex: 1 },
  optionTextActive: { color: "#4A90D9", fontWeight: "500" },

  /* Result */
  resultIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#EBF3FC",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  resultSubtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  resultCardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  resultStatCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  resultStatValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#4A90D9",
    marginBottom: 4,
  },
  resultStatLabel: { fontSize: 13, color: "#666" },

  /* Path card */
  pathCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  pathHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  pathTitle: { fontSize: 15, fontWeight: "600", color: "#333" },
  pathText: { fontSize: 14, color: "#666", lineHeight: 22 },
});
