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
import { useArenaStore } from "../../../stores/arena";

const TIER_MAP: Record<string, { label: string; bg: string; color: string; icon: string }> = {
  bronze: { label: "青铜", bg: "#FEF3C7", color: "#92400E", icon: "shield" },
  silver: { label: "白银", bg: "#F3F4F6", color: "#6B7280", icon: "shield" },
  gold: { label: "黄金", bg: "#FEF9C3", color: "#CA8A04", icon: "award" },
  platinum: { label: "铂金", bg: "#E0F2FE", color: "#0369A1", icon: "award" },
  diamond: { label: "钻石", bg: "#EDE9FE", color: "#7C3AED", icon: "star" },
  master: { label: "大师", bg: "#FCE7F3", color: "#BE185D", icon: "star" },
};

const BATTLE_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  waiting: { label: "等待中", bg: "#FEF3C7", color: "#D97706" },
  in_progress: { label: "进行中", bg: "#EBF3FC", color: "#4A90D9" },
  completed: { label: "已结束", bg: "#DCFCE7", color: "#16A34A" },
};

type TabKey = "modes" | "leaderboard" | "history";

export default function ArenaScreen() {
  const router = useRouter();
  const {
    modes,
    currentBattle,
    lastRoundResult,
    rating,
    leaderboard,
    history,
    loading,
    fetchModes,
    startBattle,
    submitRound,
    fetchRating,
    fetchLeaderboard,
    fetchHistory,
    clearBattle,
  } = useArenaStore();

  const [tab, setTab] = useState<TabKey>("modes");
  const [answerInput, setAnswerInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchModes();
    fetchRating();
    fetchLeaderboard();
    fetchHistory();
  }, []);

  const handleStartBattle = useCallback(
    async (mode: string) => {
      setAnswerInput("");
      await startBattle(mode);
    },
    [startBattle]
  );

  const handleSubmitRound = useCallback(async () => {
    if (!currentBattle || !answerInput.trim()) return;
    setSubmitting(true);
    try {
      await submitRound(currentBattle.id, answerInput.trim());
      setAnswerInput("");
    } catch {
      /* ignore */
    } finally {
      setSubmitting(false);
    }
  }, [currentBattle, answerInput, submitRound]);

  const handleBack = useCallback(() => {
    clearBattle();
    setAnswerInput("");
    fetchHistory();
  }, [clearBattle, fetchHistory]);

  const getTier = (tier: string) => TIER_MAP[tier] || TIER_MAP.bronze;

  // ── Battle View ──
  if (currentBattle) {
    const rounds = currentBattle.rounds;
    const currentRound = rounds?.current_round ?? 0;
    const maxRounds = rounds?.max_rounds ?? 0;
    const isComplete = currentBattle.status === "completed";

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.battleHeader}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#4A90D9" />
          </TouchableOpacity>
          <Text style={styles.battleTitle}>
            {currentBattle.mode} - 第 {currentRound}/{maxRounds} 回合
          </Text>
        </View>

        {/* Round indicator */}
        <View style={styles.card}>
          <View style={styles.roundIndicator}>
            {Array.from({ length: maxRounds }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.roundDot,
                  i < currentRound && styles.roundDotDone,
                  i === currentRound && styles.roundDotCurrent,
                ]}
              />
            ))}
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${maxRounds > 0 ? (currentRound / maxRounds) * 100 : 0}%` },
              ]}
            />
          </View>
        </View>

        {/* Last round result */}
        {lastRoundResult && (
          <View style={[styles.card, { backgroundColor: "#F0FDF4" }]}>
            <View style={styles.resultHeader}>
              <Feather name="check-circle" size={16} color="#16A34A" />
              <Text style={styles.resultTitle}>上一回合结果</Text>
            </View>
            {lastRoundResult.p1_score !== undefined && (
              <Text style={styles.resultScore}>
                你的得分: {String(lastRoundResult.p1_score)} | 对手得分: {String(lastRoundResult.p2_score ?? "-")}
              </Text>
            )}
            {lastRoundResult.p1_feedback ? (
              <Text style={styles.resultFeedback}>{String(lastRoundResult.p1_feedback)}</Text>
            ) : null}
          </View>
        )}

        {/* Input or Complete */}
        {isComplete ? (
          <View style={styles.card}>
            <View style={styles.completeWrap}>
              <Feather name="flag" size={40} color="#4A90D9" />
              <Text style={styles.completeTitle}>对战结束</Text>
              {currentBattle.winner_id && (
                <Text style={styles.completeSubtitle}>
                  {currentBattle.winner_id === currentBattle.player1_id ? "恭喜你获胜!" : "对手获胜，继续加油!"}
                </Text>
              )}
              {/* Final round scores */}
              {rounds?.rounds && rounds.rounds.length > 0 && (
                <View style={styles.finalScores}>
                  {rounds.rounds.map((r, i) => (
                    <View key={i} style={styles.scoreRow}>
                      <Text style={styles.scoreRound}>第{r.round}回合</Text>
                      <Text style={styles.scoreValue}>
                        {r.p1_score} : {r.p2_score}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity style={styles.primaryBtn} onPress={handleBack}>
                <Text style={styles.primaryBtnText}>返回</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.inputLabel}>输入你的答案</Text>
            <TextInput
              style={styles.textInput}
              value={answerInput}
              onChangeText={setAnswerInput}
              placeholder="在此输入..."
              placeholderTextColor="#999"
              multiline
            />
            <TouchableOpacity
              style={[styles.primaryBtn, (!answerInput.trim() || submitting) && { opacity: 0.5 }]}
              onPress={handleSubmitRound}
              disabled={!answerInput.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>提交</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  }

  // ── Tabs ──
  const TABS: { key: TabKey; label: string }[] = [
    { key: "modes", label: "对战模式" },
    { key: "leaderboard", label: "排行榜" },
    { key: "history", label: "历史" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Modes Tab ── */}
      {tab === "modes" && (
        <>
          {/* Rating card */}
          {rating && (
            <View style={styles.ratingCard}>
              <View style={styles.ratingTop}>
                <Feather
                  name={getTier(rating.tier).icon as any}
                  size={32}
                  color={getTier(rating.tier).color}
                />
                <View style={styles.ratingInfo}>
                  <Text style={styles.ratingNumber}>{rating.rating}</Text>
                  <View
                    style={[
                      styles.tierBadge,
                      { backgroundColor: getTier(rating.tier).bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tierBadgeText,
                        { color: getTier(rating.tier).color },
                      ]}
                    >
                      {getTier(rating.tier).label}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.ratingStats}>
                <View style={styles.ratingStat}>
                  <Text style={styles.ratingStatNum}>{rating.wins}</Text>
                  <Text style={styles.ratingStatLabel}>胜</Text>
                </View>
                <View style={styles.ratingDivider} />
                <View style={styles.ratingStat}>
                  <Text style={styles.ratingStatNum}>{rating.losses}</Text>
                  <Text style={styles.ratingStatLabel}>负</Text>
                </View>
                <View style={styles.ratingDivider} />
                <View style={styles.ratingStat}>
                  <Text style={styles.ratingStatNum}>
                    {rating.wins + rating.losses > 0
                      ? Math.round((rating.wins / (rating.wins + rating.losses)) * 100)
                      : 0}
                    %
                  </Text>
                  <Text style={styles.ratingStatLabel}>胜率</Text>
                </View>
              </View>
            </View>
          )}

          {/* Mode cards */}
          {loading && modes.length === 0 ? (
            <ActivityIndicator size="large" color="#4A90D9" style={{ marginTop: 32 }} />
          ) : (
            modes.map((m) => (
              <TouchableOpacity
                key={m.mode}
                style={styles.card}
                onPress={() => handleStartBattle(m.mode)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <View style={styles.modeHeader}>
                  <Feather name="crosshair" size={20} color="#4A90D9" />
                  <Text style={styles.modeName}>{m.name}</Text>
                </View>
                <Text style={styles.modeDesc}>{m.description}</Text>
                <View style={styles.modeFooter}>
                  <Text style={styles.modeRounds}>{m.rounds} 回合</Text>
                  <Feather name="play-circle" size={18} color="#4A90D9" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </>
      )}

      {/* ── Leaderboard Tab ── */}
      {tab === "leaderboard" && (
        <>
          {leaderboard.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Feather name="bar-chart-2" size={40} color="#ccc" />
              <Text style={styles.emptyText}>暂无排行数据</Text>
            </View>
          ) : (
            leaderboard.map((entry, i) => (
              <View key={entry.user_id} style={styles.card}>
                <View style={styles.leaderRow}>
                  <View style={[styles.rankBadge, i < 3 && styles.rankTop3]}>
                    <Text style={[styles.rankText, i < 3 && styles.rankTextTop3]}>
                      {i + 1}
                    </Text>
                  </View>
                  <View style={styles.leaderInfo}>
                    <Text style={styles.leaderPhone}>{entry.phone}</Text>
                    <View style={styles.leaderMeta}>
                      <View
                        style={[
                          styles.tierBadgeSmall,
                          { backgroundColor: getTier(entry.tier).bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tierBadgeSmallText,
                            { color: getTier(entry.tier).color },
                          ]}
                        >
                          {getTier(entry.tier).label}
                        </Text>
                      </View>
                      <Text style={styles.leaderWins}>{entry.wins}胜</Text>
                    </View>
                  </View>
                  <Text style={styles.leaderRating}>{entry.rating}</Text>
                </View>
              </View>
            ))
          )}
        </>
      )}

      {/* ── History Tab ── */}
      {tab === "history" && (
        <>
          {history.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Feather name="clock" size={40} color="#ccc" />
              <Text style={styles.emptyText}>暂无对战记录</Text>
            </View>
          ) : (
            history.map((b) => {
              const st = BATTLE_STATUS[b.status] || BATTLE_STATUS.completed;
              return (
                <View key={b.id} style={styles.card}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyMode}>{b.mode}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                  <View style={styles.historyMeta}>
                    <Feather name="calendar" size={13} color="#999" />
                    <Text style={styles.historyDate}>
                      {new Date(b.created_at).toLocaleDateString("zh-CN")}
                    </Text>
                    {b.winner_id && (
                      <Text style={styles.historyResult}>
                        {b.winner_id === b.player1_id ? "胜利" : "失败"}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { padding: 16, paddingBottom: 32 },

  /* Tabs */
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tabBtnActive: { backgroundColor: "#4A90D9" },
  tabText: { fontSize: 14, fontWeight: "500", color: "#666" },
  tabTextActive: { color: "#fff", fontWeight: "600" },

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

  /* Rating */
  ratingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  ratingTop: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 16 },
  ratingInfo: { flex: 1 },
  ratingNumber: { fontSize: 36, fontWeight: "700", color: "#333" },
  tierBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, alignSelf: "flex-start", marginTop: 4 },
  tierBadgeText: { fontSize: 13, fontWeight: "600" },
  ratingStats: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  ratingStat: { alignItems: "center" },
  ratingStatNum: { fontSize: 18, fontWeight: "600", color: "#333" },
  ratingStatLabel: { fontSize: 12, color: "#999", marginTop: 2 },
  ratingDivider: { width: 1, height: 28, backgroundColor: "#E5E7EB" },

  /* Mode */
  modeHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  modeName: { fontSize: 16, fontWeight: "600", color: "#333" },
  modeDesc: { fontSize: 14, color: "#666", lineHeight: 22, marginBottom: 12 },
  modeFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modeRounds: { fontSize: 13, color: "#999" },

  /* Battle */
  battleHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backBtn: { marginRight: 10 },
  battleTitle: { fontSize: 16, fontWeight: "600", color: "#333", flex: 1 },
  roundIndicator: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 12 },
  roundDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#E5E7EB" },
  roundDotDone: { backgroundColor: "#4A90D9" },
  roundDotCurrent: { backgroundColor: "#F59E0B" },
  progressBarBg: { height: 6, backgroundColor: "#E5E7EB", borderRadius: 3 },
  progressBarFill: { height: 6, backgroundColor: "#4A90D9", borderRadius: 3 },

  inputLabel: { fontSize: 14, fontWeight: "500", color: "#333", marginBottom: 8 },
  textInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#333",
    minHeight: 80,
    textAlignVertical: "top",
    backgroundColor: "#FAFAFA",
    marginBottom: 12,
  },

  primaryBtn: {
    backgroundColor: "#4A90D9",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  /* Result */
  resultHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  resultTitle: { fontSize: 15, fontWeight: "600", color: "#16A34A" },
  resultScore: { fontSize: 14, color: "#333", marginBottom: 4 },
  resultFeedback: { fontSize: 13, color: "#666", lineHeight: 20 },

  /* Complete */
  completeWrap: { alignItems: "center", paddingVertical: 16 },
  completeTitle: { fontSize: 20, fontWeight: "700", color: "#333", marginTop: 12 },
  completeSubtitle: { fontSize: 15, color: "#666", marginTop: 6, marginBottom: 16 },
  finalScores: { width: "100%", marginBottom: 16 },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  scoreRound: { fontSize: 14, color: "#666" },
  scoreValue: { fontSize: 14, fontWeight: "600", color: "#333" },

  /* Leaderboard */
  leaderRow: { flexDirection: "row", alignItems: "center" },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankTop3: { backgroundColor: "#FEF3C7" },
  rankText: { fontSize: 14, fontWeight: "600", color: "#666" },
  rankTextTop3: { color: "#CA8A04" },
  leaderInfo: { flex: 1 },
  leaderPhone: { fontSize: 15, fontWeight: "500", color: "#333" },
  leaderMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  tierBadgeSmall: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tierBadgeSmallText: { fontSize: 11, fontWeight: "600" },
  leaderWins: { fontSize: 12, color: "#999" },
  leaderRating: { fontSize: 18, fontWeight: "700", color: "#4A90D9" },

  /* History */
  historyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  historyMode: { fontSize: 15, fontWeight: "600", color: "#333" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: "600" },
  historyMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  historyDate: { fontSize: 13, color: "#999" },
  historyResult: { fontSize: 13, fontWeight: "600", color: "#4A90D9", marginLeft: 8 },

  /* Empty */
  emptyWrap: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 14, color: "#999", marginTop: 12 },
});
