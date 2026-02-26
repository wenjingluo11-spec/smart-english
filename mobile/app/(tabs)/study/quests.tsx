import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuestsStore } from "../../../stores/quests";

const CATEGORY_MAP: Record<string, { label: string; bg: string; color: string }> = {
  speaking: { label: "口语", bg: "#EDE9FE", color: "#7C3AED" },
  writing: { label: "写作", bg: "#EBF3FC", color: "#4A90D9" },
  reading: { label: "阅读", bg: "#DCFCE7", color: "#16A34A" },
  listening: { label: "听力", bg: "#FEF3C7", color: "#D97706" },
  social: { label: "社交", bg: "#FCE7F3", color: "#BE185D" },
  creative: { label: "创意", bg: "#E0F2FE", color: "#0369A1" },
};

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  active: { label: "进行中", bg: "#EBF3FC", color: "#4A90D9" },
  submitted: { label: "已提交", bg: "#FEF3C7", color: "#D97706" },
  verified: { label: "已验证", bg: "#DCFCE7", color: "#16A34A" },
  failed: { label: "未通过", bg: "#FEE2E2", color: "#DC2626" },
};

type TabKey = "available" | "my" | "community";

export default function QuestsScreen() {
  const router = useRouter();
  const {
    available,
    myQuests,
    community,
    loading,
    fetchAvailable,
    fetchMyQuests,
    fetchCommunity,
    startQuest,
    submitEvidence,
  } = useQuestsStore();

  const [tab, setTab] = useState<TabKey>("available");
  const [evidenceInputs, setEvidenceInputs] = useState<Record<number, string>>({});
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  useEffect(() => {
    fetchAvailable();
    fetchMyQuests();
    fetchCommunity();
  }, []);

  const handleStartQuest = useCallback(
    async (templateId: number) => {
      await startQuest(templateId);
      setTab("my");
    },
    [startQuest]
  );

  const handleSubmitEvidence = useCallback(
    async (questId: number) => {
      const url = evidenceInputs[questId]?.trim();
      if (!url) {
        Alert.alert("提示", "请输入证据链接");
        return;
      }
      setSubmittingId(questId);
      try {
        await submitEvidence(questId, url);
        setEvidenceInputs((prev) => {
          const next = { ...prev };
          delete next[questId];
          return next;
        });
        Alert.alert("成功", "证据已提交，等待验证");
      } catch {
        Alert.alert("错误", "提交失败，请重试");
      } finally {
        setSubmittingId(null);
      }
    },
    [evidenceInputs, submitEvidence]
  );

  const renderStars = (difficulty: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Feather
        key={i}
        name="star"
        size={14}
        color={i < difficulty ? "#F59E0B" : "#E5E7EB"}
      />
    ));
  };

  const getCategory = (cat: string) => CATEGORY_MAP[cat] || { label: cat, bg: "#F3F4F6", color: "#6B7280" };
  const getStatus = (s: string) => STATUS_MAP[s] || STATUS_MAP.active;

  const TABS: { key: TabKey; label: string }[] = [
    { key: "available", label: "可用任务" },
    { key: "my", label: "我的任务" },
    { key: "community", label: "社区展示" },
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

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#4A90D9" />
        </View>
      )}

      {/* ── Available Quests ── */}
      {tab === "available" && (
        <View>
          {available.length === 0 && !loading && (
            <View style={styles.emptyWrap}>
              <Feather name="compass" size={40} color="#CCC" />
              <Text style={styles.emptyText}>暂无可用任务</Text>
            </View>
          )}
          {available.map((quest) => {
            const cat = getCategory(quest.category);
            return (
              <View key={quest.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {quest.title}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: cat.bg }]}>
                    <Text style={[styles.badgeText, { color: cat.color }]}>{cat.label}</Text>
                  </View>
                </View>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {quest.description}
                </Text>
                <View style={styles.questMeta}>
                  <View style={styles.starsRow}>{renderStars(quest.difficulty)}</View>
                  <View style={styles.xpBadge}>
                    <Feather name="zap" size={12} color="#F59E0B" />
                    <Text style={styles.xpText}>{quest.xp_reward} XP</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.primaryBtn, quest.user_status === "active" && { opacity: 0.5 }]}
                  onPress={() => handleStartQuest(quest.id)}
                  disabled={loading || quest.user_status === "active"}
                >
                  <Feather name="plus-circle" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>
                    {quest.user_status === "active" ? "已接受" : "接受任务"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* ── My Quests ── */}
      {tab === "my" && (
        <View>
          {myQuests.length === 0 && !loading && (
            <View style={styles.emptyWrap}>
              <Feather name="clipboard" size={40} color="#CCC" />
              <Text style={styles.emptyText}>还没有接受任务</Text>
            </View>
          )}
          {myQuests.map((quest) => {
            const status = getStatus(quest.status);
            const isActive = quest.status === "active";
            return (
              <View key={quest.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {quest.title}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
                <View style={styles.questMeta}>
                  <View style={styles.starsRow}>{renderStars(quest.difficulty)}</View>
                  <View style={styles.xpBadge}>
                    <Feather name="zap" size={12} color="#F59E0B" />
                    <Text style={styles.xpText}>{quest.xp_reward} XP</Text>
                  </View>
                </View>
                <Text style={styles.dateText}>
                  开始于 {new Date(quest.started_at).toLocaleDateString("zh-CN")}
                </Text>
                {quest.completed_at && (
                  <Text style={styles.dateText}>
                    完成于 {new Date(quest.completed_at).toLocaleDateString("zh-CN")}
                  </Text>
                )}

                {/* Evidence submission */}
                {isActive && (
                  <View style={styles.evidenceSection}>
                    <TextInput
                      style={styles.textInput}
                      value={evidenceInputs[quest.id] || ""}
                      onChangeText={(text) =>
                        setEvidenceInputs((prev) => ({ ...prev, [quest.id]: text }))
                      }
                      placeholder="输入证据链接..."
                      placeholderTextColor="#999"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={[
                        styles.submitEvidenceBtn,
                        submittingId === quest.id && { opacity: 0.5 },
                      ]}
                      onPress={() => handleSubmitEvidence(quest.id)}
                      disabled={submittingId === quest.id}
                    >
                      {submittingId === quest.id ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Feather name="upload" size={14} color="#fff" />
                          <Text style={styles.submitEvidenceBtnText}>提交证据</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Verification result */}
                {quest.ai_verification && (
                  <View style={styles.verificationCard}>
                    <Feather name="check-circle" size={14} color="#16A34A" />
                    <Text style={styles.verificationText}>
                      AI 验证得分: {String((quest.ai_verification as Record<string, unknown>).score ?? "-")}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* ── Community Showcase ── */}
      {tab === "community" && (
        <View>
          {community.length === 0 && !loading && (
            <View style={styles.emptyWrap}>
              <Feather name="users" size={40} color="#CCC" />
              <Text style={styles.emptyText}>暂无社区展示</Text>
            </View>
          )}
          {community.map((item, idx) => (
            <View key={idx} style={styles.card}>
              <Text style={styles.cardTitle}>{item.quest_title}</Text>
              <View style={styles.communityMeta}>
                <View style={styles.starsRow}>{renderStars(item.difficulty)}</View>
                <View style={styles.scoreBadge}>
                  <Feather name="award" size={14} color="#4A90D9" />
                  <Text style={styles.scoreText}>{item.score} 分</Text>
                </View>
              </View>
              <Text style={styles.dateText}>
                完成于 {new Date(item.completed_at).toLocaleDateString("zh-CN")}
              </Text>
              {item.evidence_url && (
                <View style={styles.evidenceLink}>
                  <Feather name="link" size={13} color="#4A90D9" />
                  <Text style={styles.evidenceLinkText} numberOfLines={1}>
                    {item.evidence_url}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#333", flex: 1, marginRight: 8 },
  cardDesc: { fontSize: 14, color: "#666", lineHeight: 22, marginBottom: 10 },

  /* Badge */
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: "600" },

  /* Quest meta */
  questMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  starsRow: { flexDirection: "row", gap: 2 },
  xpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  xpText: { fontSize: 12, fontWeight: "600", color: "#D97706" },

  /* Primary button */
  primaryBtn: {
    flexDirection: "row",
    backgroundColor: "#4A90D9",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  /* Date */
  dateText: { fontSize: 13, color: "#999", marginBottom: 4 },

  /* Evidence */
  evidenceSection: { marginTop: 12 },
  textInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#FAFAFA",
    marginBottom: 8,
  },
  submitEvidenceBtn: {
    flexDirection: "row",
    backgroundColor: "#4A90D9",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  submitEvidenceBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  /* Verification */
  verificationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    padding: 10,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
  },
  verificationText: { fontSize: 13, color: "#16A34A", fontWeight: "500" },

  /* Community */
  communityMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 8,
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EBF3FC",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scoreText: { fontSize: 12, fontWeight: "600", color: "#4A90D9" },
  evidenceLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  evidenceLinkText: { fontSize: 13, color: "#4A90D9", flex: 1 },

  /* Loading / Empty */
  loadingWrap: { paddingVertical: 40, alignItems: "center" },
  emptyWrap: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 14, color: "#999", marginTop: 12 },
});
