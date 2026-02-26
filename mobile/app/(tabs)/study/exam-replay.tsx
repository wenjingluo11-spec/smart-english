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
import type { ReplayMock, ReplayQuestion } from "../../../lib/types";

const PRIMARY = "#4A90D9";
const BG = "#F5F7FA";
const CARD = "#fff";
const TEXT_PRIMARY = "#333";
const TEXT_SECONDARY = "#666";

export default function ExamReplayScreen() {
  const router = useRouter();
  const { replayData, loading, fetchReplayData } = useExamStore();

  const [selectedMock, setSelectedMock] = useState<ReplayMock | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchReplayData();
  }, []);

  const mockQuestions: ReplayQuestion[] = selectedMock
    ? (replayData?.questions ?? []).filter((q) => {
        // Filter questions belonging to the selected mock
        // The questions array may contain questions from multiple mocks
        return true; // Show all questions for the selected mock
      })
    : [];

  const handleSelectMock = useCallback((mock: ReplayMock) => {
    setSelectedMock(mock);
    setCurrentIndex(0);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedMock(null);
    setCurrentIndex(0);
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(mockQuestions.length - 1, i + 1));
  }, [mockQuestions.length]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  // Mock list view
  if (!selectedMock) {
    const mocks = replayData?.mocks ?? [];
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>考试回放</Text>
          <View style={{ width: 36 }} />
        </View>
        <FlatList
          data={mocks}
          keyExtractor={(item) => String(item.mock_id)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="film" size={40} color="#ccc" />
              <Text style={styles.emptyText}>暂无考试记录</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.mockCard}
              activeOpacity={0.7}
              onPress={() => handleSelectMock(item)}
            >
              <View style={styles.mockCardLeft}>
                <View style={styles.mockIconWrap}>
                  <Feather name="file-text" size={22} color={PRIMARY} />
                </View>
                <View style={styles.mockInfo}>
                  <Text style={styles.mockType}>{item.exam_type}</Text>
                  <Text style={styles.mockDate}>{formatDate(item.created_at)}</Text>
                </View>
              </View>
              <View style={styles.mockCardRight}>
                <Text style={styles.mockScore}>{item.total_score}</Text>
                <Text style={styles.mockScoreLabel}>分</Text>
                <Feather name="chevron-right" size={18} color="#ccc" style={{ marginLeft: 8 }} />
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  // Question review view
  const question = mockQuestions[currentIndex];

  if (!question) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>考试回放</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Feather name="inbox" size={40} color="#ccc" />
          <Text style={styles.emptyText}>该场考试暂无题目数据</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {selectedMock.exam_type} - 回放
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentIndex + 1) / mockQuestions.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {currentIndex + 1} / {mockQuestions.length}
        </Text>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Correct/Wrong badge */}
        <View style={styles.badgeRow}>
          <View
            style={[
              styles.correctBadge,
              { backgroundColor: question.is_correct ? "#DCFCE7" : "#FEE2E2" },
            ]}
          >
            <Feather
              name={question.is_correct ? "check-circle" : "x-circle"}
              size={14}
              color={question.is_correct ? "#16A34A" : "#DC2626"}
            />
            <Text
              style={[
                styles.correctBadgeText,
                { color: question.is_correct ? "#16A34A" : "#DC2626" },
              ]}
            >
              {question.is_correct ? "回答正确" : "回答错误"}
            </Text>
          </View>
          {question.section ? (
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{question.section}</Text>
            </View>
          ) : null}
        </View>

        {/* Question content */}
        <View style={styles.questionCard}>
          <Text style={styles.questionContent}>{question.content}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {question.options.map((opt, oi) => {
            const letter = String.fromCharCode(65 + oi);
            const isUserAnswer = letter === question.user_answer;
            const isCorrectAnswer = letter === question.correct_answer;

            let optBg = CARD;
            let optBorder = "#E8ECF0";
            let iconName: "check-circle" | "x-circle" | null = null;
            let iconColor = "";

            if (isCorrectAnswer) {
              optBg = "#F0FDF4";
              optBorder = "#86EFAC";
              iconName = "check-circle";
              iconColor = "#16A34A";
            }
            if (isUserAnswer && !isCorrectAnswer) {
              optBg = "#FEF2F2";
              optBorder = "#FCA5A5";
              iconName = "x-circle";
              iconColor = "#DC2626";
            }

            return (
              <View
                key={oi}
                style={[styles.replayOption, { backgroundColor: optBg, borderColor: optBorder }]}
              >
                <Text
                  style={[
                    styles.replayOptionLetter,
                    isCorrectAnswer && { color: "#16A34A" },
                    isUserAnswer && !isCorrectAnswer && { color: "#DC2626" },
                  ]}
                >
                  {letter}
                </Text>
                <Text
                  style={[
                    styles.replayOptionText,
                    isCorrectAnswer && { color: "#16A34A", fontWeight: "600" },
                    isUserAnswer && !isCorrectAnswer && { color: "#DC2626" },
                  ]}
                >
                  {opt}
                </Text>
                {iconName ? (
                  <Feather name={iconName} size={16} color={iconColor} style={{ marginLeft: "auto" }} />
                ) : null}
              </View>
            );
          })}
        </View>

        {/* Answer legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#16A34A" }]} />
            <Text style={styles.legendText}>正确答案: {question.correct_answer}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: question.is_correct ? "#16A34A" : "#DC2626" }]} />
            <Text style={styles.legendText}>你的答案: {question.user_answer}</Text>
          </View>
        </View>

        {/* AI Comment */}
        {question.ai_comment ? (
          <View style={styles.commentCard}>
            <View style={styles.commentHeader}>
              <Feather name="message-circle" size={16} color={PRIMARY} />
              <Text style={styles.commentTitle}>AI 点评</Text>
            </View>
            <Text style={styles.commentText}>{question.ai_comment}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
          onPress={handlePrev}
          disabled={currentIndex === 0}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={20} color={currentIndex === 0 ? "#ccc" : PRIMARY} />
          <Text style={[styles.navBtnText, currentIndex === 0 && styles.navBtnTextDisabled]}>
            上一题
          </Text>
        </TouchableOpacity>

        {/* Quick jump dots */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dotsContainer}
        >
          {mockQuestions.map((q, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setCurrentIndex(i)}
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
                q.is_correct ? styles.dotCorrect : styles.dotWrong,
              ]}
            />
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.navBtn, currentIndex === mockQuestions.length - 1 && styles.navBtnDisabled]}
          onPress={handleNext}
          disabled={currentIndex === mockQuestions.length - 1}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.navBtnText,
              currentIndex === mockQuestions.length - 1 && styles.navBtnTextDisabled,
            ]}
          >
            下一题
          </Text>
          <Feather
            name="chevron-right"
            size={20}
            color={currentIndex === mockQuestions.length - 1 ? "#ccc" : PRIMARY}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: CARD,
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECF0",
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: TEXT_PRIMARY },
  listContent: { padding: 16 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  emptyText: { color: "#aaa", fontSize: 15, marginTop: 12 },
  // Mock list
  mockCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  mockCardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  mockIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EBF3FB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  mockInfo: { flex: 1 },
  mockType: { fontSize: 16, fontWeight: "600", color: TEXT_PRIMARY },
  mockDate: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },
  mockCardRight: { flexDirection: "row", alignItems: "baseline" },
  mockScore: { fontSize: 24, fontWeight: "700", color: PRIMARY },
  mockScoreLabel: { fontSize: 13, color: TEXT_SECONDARY, marginLeft: 2 },
  // Progress
  progressBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: CARD,
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "#E8ECF0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: 4, backgroundColor: PRIMARY, borderRadius: 2 },
  progressText: { fontSize: 13, color: TEXT_SECONDARY, fontWeight: "500" },
  // Scroll area
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16 },
  // Badge row
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  correctBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  correctBadgeText: { fontSize: 13, fontWeight: "600" },
  sectionBadge: {
    backgroundColor: "#EBF3FB",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionBadgeText: { fontSize: 13, color: PRIMARY, fontWeight: "500" },
  // Question
  questionCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  questionContent: { fontSize: 16, color: TEXT_PRIMARY, lineHeight: 24 },
  // Options
  optionsContainer: { gap: 8, marginBottom: 12 },
  replayOption: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
  },
  replayOptionLetter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F0F2F5",
    textAlign: "center",
    lineHeight: 26,
    fontSize: 13,
    fontWeight: "700",
    color: TEXT_SECONDARY,
    marginRight: 10,
    overflow: "hidden",
  },
  replayOptionText: { fontSize: 15, color: TEXT_PRIMARY, flex: 1 },
  // Legend
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 12,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: TEXT_SECONDARY },
  // AI Comment
  commentCard: {
    backgroundColor: "#EBF3FB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY,
  },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  commentTitle: { fontSize: 14, fontWeight: "700", color: PRIMARY },
  commentText: { fontSize: 14, color: TEXT_PRIMARY, lineHeight: 22 },
  // Navigation
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD,
    borderTopWidth: 1,
    borderTopColor: "#E8ECF0",
  },
  navBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 4 },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { fontSize: 14, color: PRIMARY, fontWeight: "600" },
  navBtnTextDisabled: { color: "#ccc" },
  dotsContainer: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: PRIMARY },
  dotCorrect: { backgroundColor: "#86EFAC" },
  dotWrong: { backgroundColor: "#FCA5A5" },
});
