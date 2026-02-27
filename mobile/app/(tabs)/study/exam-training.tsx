import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useExamStore } from "../../../stores/exam";
import AudioPlayer from "../../../components/cognitive/AudioPlayer";
import CognitiveFeedback from "../../../components/cognitive/CognitiveFeedback";
import SyncReader from "../../../components/cognitive/SyncReader";
import ExpertDemo from "../../../components/cognitive/ExpertDemo";

const PRIMARY = "#4A90D9";
const BG = "#F5F7FA";
const CARD = "#fff";
const TEXT_PRIMARY = "#333";
const TEXT_SECONDARY = "#666";

export default function ExamTrainingScreen() {
  const router = useRouter();
  const {
    trainingSections,
    trainingQuestions,
    loading,
    fetchTrainingSections,
    fetchTrainingQuestions,
    submitTraining,
  } = useExamStore();

  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{ correct: number; total: number }>({
    correct: 0,
    total: 0,
  });
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    fetchTrainingSections();
  }, []);

  const handleSelectSection = useCallback(
    async (section: string) => {
      setSelectedSection(section);
      setCurrentIndex(0);
      setSelectedOption(null);
      setFeedback(null);
      setResults({ correct: 0, total: 0 });
      setFinished(false);
      await fetchTrainingQuestions(section);
    },
    [fetchTrainingQuestions]
  );

  const handleSubmit = useCallback(async () => {
    if (!selectedOption || submitting) return;
    const question = trainingQuestions[currentIndex];
    if (!question) return;
    setSubmitting(true);
    try {
      const res = await submitTraining(question.id, selectedOption);
      setFeedback(res);
      setResults((prev) => ({
        correct: prev.correct + (res.is_correct ? 1 : 0),
        total: prev.total + 1,
      }));
    } catch {
      /* ignore */
    }
    setSubmitting(false);
  }, [selectedOption, submitting, trainingQuestions, currentIndex, submitTraining]);

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= trainingQuestions.length) {
      setFinished(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelectedOption(null);
    setFeedback(null);
  }, [currentIndex, trainingQuestions.length]);

  const handleBack = useCallback(() => {
    setSelectedSection(null);
    setCurrentIndex(0);
    setSelectedOption(null);
    setFeedback(null);
    setResults({ correct: 0, total: 0 });
    setFinished(false);
  }, []);

  // Loading state
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  // Step 1: Section selection
  if (!selectedSection) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>专项训练</Text>
          <View style={{ width: 36 }} />
        </View>
        <FlatList
          data={trainingSections}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="inbox" size={40} color="#ccc" />
              <Text style={styles.emptyText}>暂无可用板块</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => handleSelectSection(item)}
            >
              <View style={styles.cardRow}>
                <View style={styles.sectionIcon}>
                  <Feather name="book-open" size={20} color={PRIMARY} />
                </View>
                <Text style={styles.sectionText}>{item}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#ccc" />
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  // Completion summary
  if (finished) {
    const accuracy = results.total > 0 ? Math.round((results.correct / results.total) * 100) : 0;
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>训练完成</Text>
          <View style={{ width: 36 }} />
        </View>
        <ScrollView contentContainerStyle={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Feather name="award" size={48} color={PRIMARY} />
            <Text style={styles.summaryTitle}>训练结束</Text>
            <Text style={styles.summarySection}>{selectedSection}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{results.total}</Text>
                <Text style={styles.statLabel}>总题数</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: "#4CAF50" }]}>{results.correct}</Text>
                <Text style={styles.statLabel}>正确</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: PRIMARY }]}>{accuracy}%</Text>
                <Text style={styles.statLabel}>正确率</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleBack}>
            <Feather name="rotate-ccw" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>重新选择板块</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: "#fff", borderWidth: 1, borderColor: PRIMARY }]}
            onPress={() => router.back()}
          >
            <Feather name="home" size={18} color={PRIMARY} />
            <Text style={[styles.primaryBtnText, { color: PRIMARY }]}>返回</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Step 2: Question answering
  const question = trainingQuestions[currentIndex];
  if (!question) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>暂无题目</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleBack}>
          <Text style={styles.primaryBtnText}>返回选择板块</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedSection}</Text>
        <Text style={styles.progressText}>
          {currentIndex + 1}/{trainingQuestions.length}
        </Text>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentIndex + 1) / trainingQuestions.length) * 100}%` },
          ]}
        />
      </View>

      <ScrollView style={styles.questionScroll} contentContainerStyle={styles.questionContent}>
        <View style={styles.card}>
          <View style={styles.difficultyRow}>
            <Feather name="bar-chart-2" size={14} color={TEXT_SECONDARY} />
            <Text style={styles.difficultyText}>难度 {question.difficulty}</Text>
          </View>
          <Text style={styles.questionText}>{question.content}</Text>
          <View style={{ marginTop: 8 }}>
            <AudioPlayer text={question.content} compact label="朗读" />
          </View>
        </View>

        {question.options.map((opt, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isSelected = selectedOption === opt;
          const isDisabled = !!feedback;
          const isCorrect = feedback && (feedback.correct_answer as string) === opt;
          const isWrong = feedback && isSelected && !(feedback.is_correct as boolean);

          let optStyle = styles.optionCard;
          if (isCorrect) optStyle = { ...styles.optionCard, ...styles.optionCorrect };
          else if (isWrong) optStyle = { ...styles.optionCard, ...styles.optionWrong };
          else if (isSelected) optStyle = { ...styles.optionCard, ...styles.optionSelected };

          return (
            <TouchableOpacity
              key={idx}
              style={optStyle}
              activeOpacity={0.7}
              disabled={isDisabled}
              onPress={() => setSelectedOption(opt)}
            >
              <View
                style={[
                  styles.optionLetter,
                  isSelected && !feedback && { backgroundColor: PRIMARY },
                  isCorrect && { backgroundColor: "#4CAF50" },
                  isWrong && { backgroundColor: "#F44336" },
                ]}
              >
                <Text
                  style={[
                    styles.optionLetterText,
                    (isSelected || isCorrect || isWrong) && { color: "#fff" },
                  ]}
                >
                  {letter}
                </Text>
              </View>
              <Text style={styles.optionText}>{opt}</Text>
              {isCorrect && <Feather name="check-circle" size={18} color="#4CAF50" />}
              {isWrong && <Feather name="x-circle" size={18} color="#F44336" />}
            </TouchableOpacity>
          );
        })}

        {feedback ? (
          <View style={[styles.card, styles.feedbackCard]}>
            <View style={styles.feedbackHeader}>
              <Feather
                name={feedback.is_correct ? "check-circle" : "x-circle"}
                size={20}
                color={feedback.is_correct ? "#4CAF50" : "#F44336"}
              />
              <Text
                style={[
                  styles.feedbackTitle,
                  { color: feedback.is_correct ? "#4CAF50" : "#F44336" },
                ]}
              >
                {feedback.is_correct ? "回答正确" : "回答错误"}
              </Text>
            </View>
            {/* 认知增强反馈 */}
            <CognitiveFeedback result={feedback as any} />
            {/* V2: 视听同步跟读 */}
            <SyncReader text={question.content} />
            {/* V2: 学霸审题演示 */}
            <ExpertDemo questionText={question.content} questionId={question.id} source="exam" />
            {/* 传统解析兜底 */}
            {!feedback.how_to_spot && feedback.explanation ? (
              <Text style={styles.feedbackExplanation}>
                {String(feedback.explanation)}
              </Text>
            ) : null}
            {feedback.knowledge_point ? (
              <View style={styles.knowledgeTag}>
                <Feather name="tag" size={12} color={PRIMARY} />
                <Text style={styles.knowledgeText}>
                  {String(feedback.knowledge_point)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {!feedback ? (
          <TouchableOpacity
            style={[styles.primaryBtn, !selectedOption && styles.btnDisabled]}
            disabled={!selectedOption || submitting}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>提交答案</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
            <Text style={styles.primaryBtnText}>
              {currentIndex + 1 >= trainingQuestions.length ? "查看结果" : "下一题"}
            </Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, backgroundColor: BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: CARD,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: TEXT_PRIMARY },
  progressText: { fontSize: 14, color: TEXT_SECONDARY, width: 50, textAlign: "right" },
  progressBar: {
    height: 3,
    backgroundColor: "#E0E0E0",
  },
  progressFill: {
    height: 3,
    backgroundColor: PRIMARY,
    borderRadius: 2,
  },
  listContent: { padding: 16 },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EBF3FB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sectionText: { fontSize: 16, fontWeight: "500", color: TEXT_PRIMARY },
  emptyText: { color: "#999", fontSize: 15, marginTop: 12 },
  questionScroll: { flex: 1 },
  questionContent: { padding: 16, paddingBottom: 40 },
  difficultyRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 10 },
  difficultyText: { fontSize: 13, color: TEXT_SECONDARY },
  questionText: { fontSize: 16, lineHeight: 24, color: TEXT_PRIMARY, fontWeight: "500" },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  optionSelected: { borderColor: PRIMARY, backgroundColor: "#F0F6FD" },
  optionCorrect: { borderColor: "#4CAF50", backgroundColor: "#F0FAF0" },
  optionWrong: { borderColor: "#F44336", backgroundColor: "#FFF5F5" },
  optionLetter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionLetterText: { fontSize: 14, fontWeight: "600", color: TEXT_SECONDARY },
  optionText: { flex: 1, fontSize: 15, color: TEXT_PRIMARY, lineHeight: 22 },
  feedbackCard: { borderLeftWidth: 4, borderLeftColor: PRIMARY },
  feedbackHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  feedbackTitle: { fontSize: 15, fontWeight: "600" },
  feedbackExplanation: { fontSize: 14, color: TEXT_SECONDARY, lineHeight: 22, marginBottom: 8 },
  knowledgeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EBF3FB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  knowledgeText: { fontSize: 13, color: PRIMARY, fontWeight: "500" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  btnDisabled: { opacity: 0.5 },
  summaryContainer: { padding: 20, alignItems: "center" },
  summaryCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  summaryTitle: { fontSize: 22, fontWeight: "700", color: TEXT_PRIMARY, marginTop: 12 },
  summarySection: { fontSize: 15, color: TEXT_SECONDARY, marginTop: 4, marginBottom: 20 },
  statsRow: { flexDirection: "row", alignItems: "center", width: "100%" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 28, fontWeight: "700", color: TEXT_PRIMARY },
  statLabel: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 4 },
  statDivider: { width: 1, height: 36, backgroundColor: "#E0E0E0" },
});
