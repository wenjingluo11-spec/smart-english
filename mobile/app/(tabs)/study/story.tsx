import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useStoryStore } from "../../../stores/story";

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  in_progress: { label: "进行中", bg: "#EBF3FC", color: "#4A90D9" },
  completed: { label: "已完成", bg: "#DCFCE7", color: "#16A34A" },
  abandoned: { label: "已放弃", bg: "#F3F4F6", color: "#9CA3AF" },
};

const GENRE_COLORS: Record<string, string> = {
  adventure: "#F59E0B",
  mystery: "#8B5CF6",
  romance: "#EC4899",
  sci_fi: "#06B6D4",
  fantasy: "#10B981",
  horror: "#EF4444",
};

export default function StoryScreen() {
  const router = useRouter();
  const {
    templates,
    sessions,
    currentSession,
    currentChapter,
    loading,
    fetchTemplates,
    fetchSessions,
    startStory,
    loadSession,
    makeChoice,
    submitChallenge,
  } = useStoryStore();

  const [tab, setTab] = useState<"templates" | "sessions">("templates");
  const [challengeAnswer, setChallengeAnswer] = useState("");
  const [challengeResult, setChallengeResult] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchSessions();
  }, []);

  const handleStartStory = useCallback(
    async (templateId: number) => {
      await startStory(templateId);
    },
    [startStory]
  );

  const handleLoadSession = useCallback(
    async (sessionId: number) => {
      await loadSession(sessionId);
    },
    [loadSession]
  );

  const handleMakeChoice = useCallback(
    async (label: string) => {
      setChallengeAnswer("");
      setChallengeResult(null);
      await makeChoice(label);
    },
    [makeChoice]
  );

  const handleSubmitChallenge = useCallback(async () => {
    if (!currentChapter || !challengeAnswer.trim()) return;
    setSubmitting(true);
    try {
      const res = await submitChallenge(currentChapter.id, challengeAnswer.trim());
      setChallengeResult(res);
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  }, [currentChapter, challengeAnswer, submitChallenge]);

  const handleBackToList = useCallback(() => {
    useStoryStore.setState({ currentSession: null, currentChapter: null, allChapters: [] });
    setChallengeAnswer("");
    setChallengeResult(null);
    fetchSessions();
  }, [fetchSessions]);

  // ── Reader View ──
  if (currentSession && currentChapter) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Loading overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#4A90D9" />
            <Text style={styles.loadingText}>故事生成中...</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.readerHeader}>
          <TouchableOpacity onPress={handleBackToList} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#4A90D9" />
          </TouchableOpacity>
          <Text style={styles.readerTitle} numberOfLines={1}>
            {currentSession.template_title}
          </Text>
          <Text style={styles.chapterIndicator}>
            第 {currentChapter.chapter_number} 章 / {currentSession.total_chapters}
          </Text>
        </View>

        {/* Narrative */}
        <View style={styles.card}>
          <Text style={styles.narrativeText}>{currentChapter.narrative_text}</Text>
        </View>

        {/* Choices */}
        {currentChapter.choices && currentChapter.choices.length > 0 && !currentChapter.chosen_option && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              <Feather name="git-branch" size={16} color="#4A90D9" /> 做出选择
            </Text>
            {currentChapter.choices.map((choice, i) => (
              <TouchableOpacity
                key={i}
                style={styles.choiceBtn}
                onPress={() => handleMakeChoice(choice.label)}
                disabled={loading}
              >
                <Text style={styles.choiceLabel}>{choice.label}</Text>
                <Text style={styles.choiceDesc}>{choice.description}</Text>
                <Feather name="chevron-right" size={16} color="#4A90D9" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Challenge */}
        {currentChapter.challenge && (
          <View style={styles.card}>
            <View style={styles.challengeHeader}>
              <Feather name="zap" size={16} color="#F59E0B" />
              <Text style={styles.sectionTitle}>挑战题</Text>
              <View style={styles.challengeTypeBadge}>
                <Text style={styles.challengeTypeText}>{currentChapter.challenge.type}</Text>
              </View>
            </View>
            <Text style={styles.challengeQuestion}>{currentChapter.challenge.question}</Text>

            {currentChapter.challenge.options && currentChapter.challenge.options.length > 0 ? (
              currentChapter.challenge.options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.optionBtn,
                    challengeAnswer === opt && styles.optionBtnActive,
                  ]}
                  onPress={() => {
                    if (!challengeResult) setChallengeAnswer(opt);
                  }}
                  disabled={!!challengeResult}
                >
                  <Text
                    style={[
                      styles.optionText,
                      challengeAnswer === opt && styles.optionTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <TextInput
                style={styles.textInput}
                placeholder="输入你的答案..."
                placeholderTextColor="#999"
                value={challengeAnswer}
                onChangeText={setChallengeAnswer}
                editable={!challengeResult}
              />
            )}

            {!challengeResult && (
              <TouchableOpacity
                style={[styles.primaryBtn, (!challengeAnswer.trim() || submitting) && { opacity: 0.5 }]}
                onPress={handleSubmitChallenge}
                disabled={!challengeAnswer.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.primaryBtnText}>提交答案</Text>
                )}
              </TouchableOpacity>
            )}

            {challengeResult && (
              <View
                style={[
                  styles.resultCard,
                  (challengeResult.is_correct as boolean) ? styles.resultCorrect : styles.resultWrong,
                ]}
              >
                <View style={styles.resultHeader}>
                  <Feather
                    name={(challengeResult.is_correct as boolean) ? "check-circle" : "x-circle"}
                    size={18}
                    color={(challengeResult.is_correct as boolean) ? "#16A34A" : "#DC2626"}
                  />
                  <Text
                    style={[
                      styles.resultTitle,
                      { color: (challengeResult.is_correct as boolean) ? "#16A34A" : "#DC2626" },
                    ]}
                  >
                    {(challengeResult.is_correct as boolean) ? "回答正确" : "回答错误"}
                  </Text>
                </View>
                {challengeResult.explanation ? (
                  <Text style={styles.resultExplanation}>
                    {String(challengeResult.explanation)}
                  </Text>
                ) : null}
              </View>
            )}

            {currentChapter.challenge.hint && !challengeResult && (
              <Text style={styles.hintText}>
                <Feather name="info" size={12} color="#999" /> 提示: {currentChapter.challenge.hint}
              </Text>
            )}
          </View>
        )}

        {/* Learning Points */}
        {currentChapter.learning_points && currentChapter.learning_points.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              <Feather name="book-open" size={16} color="#4A90D9" /> 学习要点
            </Text>
            {currentChapter.learning_points.map((lp, i) => (
              <View key={i} style={styles.learningPoint}>
                <View style={styles.lpHeader}>
                  <Text style={styles.lpWord}>{lp.word}</Text>
                  <Text style={styles.lpMeaning}>{lp.meaning}</Text>
                </View>
                <Text style={styles.lpUsage}>{lp.usage}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  // ── List View ──
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>互动故事</Text>
      <Text style={styles.pageSubtitle}>在故事中学习英语，边读边练</Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(["templates", "sessions"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === "templates" ? "故事库" : "我的故事"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Templates */}
      {tab === "templates" && (
        <>
          {templates.length === 0 && !loading && (
            <View style={styles.emptyWrap}>
              <Feather name="book" size={40} color="#CCC" />
              <Text style={styles.emptyText}>暂无故事模板</Text>
            </View>
          )}
          {templates.map((tpl) => (
            <TouchableOpacity
              key={tpl.id}
              style={styles.card}
              onPress={() => handleStartStory(tpl.id)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <View style={styles.templateHeader}>
                <Text style={styles.coverEmoji}>{tpl.cover_emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.templateTitle}>{tpl.title}</Text>
                  <View style={styles.badgeRow}>
                    <View
                      style={[
                        styles.genreBadge,
                        { backgroundColor: (GENRE_COLORS[tpl.genre] || "#6B7280") + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.genreText,
                          { color: GENRE_COLORS[tpl.genre] || "#6B7280" },
                        ]}
                      >
                        {tpl.genre}
                      </Text>
                    </View>
                    <View style={styles.cefrBadge}>
                      <Text style={styles.cefrText}>
                        {tpl.cefr_min}–{tpl.cefr_max}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <Text style={styles.synopsis} numberOfLines={3}>
                {tpl.synopsis}
              </Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Sessions */}
      {tab === "sessions" && (
        <>
          {sessions.length === 0 && !loading && (
            <View style={styles.emptyWrap}>
              <Feather name="bookmark" size={40} color="#CCC" />
              <Text style={styles.emptyText}>还没有开始任何故事</Text>
            </View>
          )}
          {sessions.map((s) => {
            const st = STATUS_MAP[s.status] || STATUS_MAP.in_progress;
            return (
              <TouchableOpacity
                key={s.id}
                style={styles.card}
                onPress={() => handleLoadSession(s.id)}
                activeOpacity={0.7}
              >
                <View style={styles.sessionHeader}>
                  <Text style={styles.coverEmoji}>{s.cover_emoji || "📖"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.templateTitle}>{s.template_title}</Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.sessionFooter}>
                  <Text style={styles.sessionProgress}>
                    <Feather name="layers" size={12} color="#999" /> 章节 {s.current_chapter} / {s.total_chapters}
                  </Text>
                  <Text style={styles.sessionDate}>
                    {new Date(s.started_at).toLocaleDateString("zh-CN")}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {loading && !currentSession && (
        <ActivityIndicator size="large" color="#4A90D9" style={{ marginTop: 32 }} />
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { padding: 16 },

  pageTitle: { fontSize: 22, fontWeight: "700", color: "#333", marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: "#666", marginBottom: 20 },

  /* Tabs */
  tabRow: { flexDirection: "row", marginBottom: 16, gap: 8 },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tabBtnActive: { backgroundColor: "#4A90D9", borderColor: "#4A90D9" },
  tabText: { fontSize: 14, fontWeight: "500", color: "#666" },
  tabTextActive: { color: "#fff" },

  /* Card */
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  /* Template */
  templateHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  coverEmoji: { fontSize: 36 },
  templateTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 4 },
  badgeRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  genreBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  genreText: { fontSize: 12, fontWeight: "600" },
  cefrBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: "#EBF3FC" },
  cefrText: { fontSize: 12, fontWeight: "600", color: "#4A90D9" },
  synopsis: { fontSize: 14, color: "#666", lineHeight: 22 },

  /* Session */
  sessionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: "600" },
  sessionFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sessionProgress: { fontSize: 13, color: "#666" },
  sessionDate: { fontSize: 12, color: "#999" },

  /* Reader */
  readerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  backBtn: { padding: 4 },
  readerTitle: { flex: 1, fontSize: 17, fontWeight: "600", color: "#333" },
  chapterIndicator: { fontSize: 13, color: "#4A90D9", fontWeight: "500" },

  narrativeText: { fontSize: 16, color: "#333", lineHeight: 28 },

  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#333", marginBottom: 12 },

  /* Choices */
  choiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    marginBottom: 8,
    gap: 8,
  },
  choiceLabel: { fontSize: 15, fontWeight: "600", color: "#4A90D9" },
  choiceDesc: { flex: 1, fontSize: 14, color: "#666" },

  /* Challenge */
  challengeHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  challengeTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
  },
  challengeTypeText: { fontSize: 11, fontWeight: "600", color: "#D97706" },
  challengeQuestion: { fontSize: 15, color: "#333", lineHeight: 24, marginBottom: 12 },

  optionBtn: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    marginBottom: 8,
  },
  optionBtnActive: { borderColor: "#4A90D9", backgroundColor: "#EBF3FC" },
  optionText: { fontSize: 15, color: "#333" },
  optionTextActive: { color: "#4A90D9", fontWeight: "500" },

  textInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#FAFAFA",
    marginBottom: 8,
  },

  primaryBtn: {
    backgroundColor: "#4A90D9",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  resultCard: { marginTop: 12, padding: 14, borderRadius: 12 },
  resultCorrect: { backgroundColor: "#F0FDF4" },
  resultWrong: { backgroundColor: "#FEF2F2" },
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  resultTitle: { fontSize: 15, fontWeight: "600" },
  resultExplanation: { fontSize: 14, color: "#333", lineHeight: 22 },

  hintText: { fontSize: 13, color: "#999", marginTop: 8, lineHeight: 20 },

  /* Learning Points */
  learningPoint: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    marginBottom: 8,
  },
  lpHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  lpWord: { fontSize: 15, fontWeight: "600", color: "#4A90D9" },
  lpMeaning: { fontSize: 14, color: "#333" },
  lpUsage: { fontSize: 13, color: "#666", lineHeight: 20, fontStyle: "italic" },

  /* Loading overlay */
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.85)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  loadingText: { marginTop: 12, fontSize: 15, color: "#4A90D9", fontWeight: "500" },

  /* Empty */
  emptyWrap: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 14, color: "#999", marginTop: 12 },
});
