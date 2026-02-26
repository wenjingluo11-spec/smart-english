import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useErrorsStore } from "../../../stores/errors";

const FILTERS = [
  { label: "全部", value: undefined },
  { label: "未掌握", value: "unmastered" },
  { label: "已掌握", value: "mastered" },
] as const;

function difficultyStars(d: number) {
  return "★".repeat(Math.min(d, 5)) + "☆".repeat(Math.max(5 - d, 0));
}

export default function ErrorsScreen() {
  const router = useRouter();
  const {
    entries, total, page, pageSize, filter, stats, loading,
    fetchErrors, fetchStats, setFilter, setPage,
    retryError, markMastered, deleteError,
  } = useErrorsStore();

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [retryId, setRetryId] = useState<number | null>(null);
  const [retryAnswer, setRetryAnswer] = useState("");
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryResult, setRetryResult] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetchStats();
    fetchErrors();
  }, []);

  const hasMore = total > page * pageSize;

  const handleRetry = useCallback(async (id: number) => {
    if (!retryAnswer.trim()) return Alert.alert("提示", "请输入答案");
    setRetryLoading(true);
    setRetryResult(null);
    try {
      const res = await retryError(id, retryAnswer.trim());
      setRetryResult(res);
      if (res.is_correct) {
        setRetryId(null);
        setRetryAnswer("");
      }
    } catch (e: any) {
      Alert.alert("错误", e.message ?? "重试失败");
    } finally {
      setRetryLoading(false);
    }
  }, [retryAnswer, retryError]);

  const handleDelete = useCallback((id: number) => {
    Alert.alert("确认删除", "确定要删除这条错题记录吗？", [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: () => deleteError(id) },
    ]);
  }, [deleteError]);

  const activeFilter = FILTERS.find((f) => f.value === filter.status) ?? FILTERS[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Stats Summary */}
      {stats && (
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>错题统计</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{stats.total}</Text>
              <Text style={styles.statLabel}>总计</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: "#E74C3C" }]}>{stats.unmastered}</Text>
              <Text style={styles.statLabel}>未掌握</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: "#27AE60" }]}>{stats.mastered}</Text>
              <Text style={styles.statLabel}>已掌握</Text>
            </View>
          </View>
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterTab, activeFilter.label === f.label && styles.filterTabActive]}
            onPress={() => setFilter({ status: f.value })}
          >
            <Text style={[styles.filterText, activeFilter.label === f.label && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Loading */}
      {loading && entries.length === 0 && (
        <ActivityIndicator size="large" color="#4A90D9" style={{ marginTop: 40 }} />
      )}

      {/* Empty */}
      {!loading && entries.length === 0 && (
        <View style={styles.emptyWrap}>
          <Feather name="inbox" size={48} color="#ccc" />
          <Text style={styles.emptyText}>暂无错题记录</Text>
        </View>
      )}

      {/* Error List */}
      {entries.map((item) => {
        const isExpanded = expandedId === item.id;
        const isRetrying = retryId === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.errorCard}
            activeOpacity={0.7}
            onPress={() => {
              setExpandedId(isExpanded ? null : item.id);
              setRetryId(null);
              setRetryAnswer("");
              setRetryResult(null);
            }}
          >
            {/* Collapsed header */}
            <View style={styles.errorHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.errorQuestion} numberOfLines={isExpanded ? undefined : 2}>
                  {item.question_snapshot}
                </Text>
                <View style={styles.errorMeta}>
                  <View style={styles.topicBadge}>
                    <Text style={styles.topicBadgeText}>{item.topic}</Text>
                  </View>
                  <Text style={styles.diffStars}>{difficultyStars(item.difficulty)}</Text>
                  <Text style={[styles.statusLabel, item.status === "mastered" ? styles.statusMastered : styles.statusUnmastered]}>
                    {item.status === "mastered" ? "已掌握" : "未掌握"}
                  </Text>
                </View>
              </View>
              <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color="#999" />
            </View>

            {/* Expanded detail */}
            {isExpanded && (
              <View style={styles.expandedBody}>
                <Text style={styles.expandLabel}>完整题目</Text>
                <Text style={styles.expandText}>{item.question_snapshot}</Text>

                <Text style={styles.expandLabel}>你的答案</Text>
                <Text style={[styles.expandText, { color: "#E74C3C" }]}>{item.user_answer}</Text>

                <Text style={styles.expandLabel}>正确答案</Text>
                <Text style={[styles.expandText, { color: "#27AE60" }]}>{item.correct_answer}</Text>

                <Text style={styles.expandLabel}>解析</Text>
                <Text style={styles.expandText}>{item.explanation}</Text>

                {/* Retry input */}
                {isRetrying && (
                  <View style={styles.retryWrap}>
                    <TextInput
                      style={styles.retryInput}
                      placeholder="输入你的答案"
                      placeholderTextColor="#999"
                      value={retryAnswer}
                      onChangeText={setRetryAnswer}
                    />
                    <TouchableOpacity
                      style={[styles.retrySubmitBtn, retryLoading && { opacity: 0.6 }]}
                      onPress={() => handleRetry(item.id)}
                      disabled={retryLoading}
                    >
                      {retryLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.retrySubmitText}>提交</Text>
                      )}
                    </TouchableOpacity>
                    {retryResult && (
                      <View style={[styles.retryFeedback, retryResult.is_correct ? styles.feedbackCorrect : styles.feedbackWrong]}>
                        <Text style={styles.retryFeedbackText}>
                          {retryResult.is_correct ? "回答正确!" : "回答错误，再试试吧"}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Action buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                      setRetryId(isRetrying ? null : item.id);
                      setRetryAnswer("");
                      setRetryResult(null);
                    }}
                  >
                    <Feather name="refresh-cw" size={14} color="#4A90D9" />
                    <Text style={styles.actionText}>重试</Text>
                  </TouchableOpacity>
                  {item.status !== "mastered" && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => markMastered(item.id)}>
                      <Feather name="check-circle" size={14} color="#27AE60" />
                      <Text style={[styles.actionText, { color: "#27AE60" }]}>标记掌握</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                    <Feather name="trash-2" size={14} color="#E74C3C" />
                    <Text style={[styles.actionText, { color: "#E74C3C" }]}>删除</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      {/* Pagination */}
      {hasMore && (
        <TouchableOpacity
          style={styles.loadMoreBtn}
          onPress={() => setPage(page + 1)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#4A90D9" size="small" />
          ) : (
            <Text style={styles.loadMoreText}>加载更多</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { padding: 16, paddingBottom: 40 },

  /* Stats */
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statsTitle: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 12 },
  statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statNum: { fontSize: 24, fontWeight: "700", color: "#4A90D9" },
  statLabel: { fontSize: 12, color: "#666", marginTop: 4 },
  statDivider: { width: 1, height: 32, backgroundColor: "#E5E7EB" },

  /* Filters */
  filterRow: { flexDirection: "row", marginBottom: 16, gap: 8 },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterTabActive: { backgroundColor: "#4A90D9", borderColor: "#4A90D9" },
  filterText: { fontSize: 14, color: "#666" },
  filterTextActive: { color: "#fff", fontWeight: "600" },

  /* Empty */
  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, color: "#999", marginTop: 12 },

  /* Error Card */
  errorCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  errorHeader: { flexDirection: "row", alignItems: "flex-start" },
  errorQuestion: { fontSize: 15, color: "#333", lineHeight: 22, fontWeight: "500" },
  errorMeta: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 8 },
  topicBadge: {
    backgroundColor: "#EBF3FC",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  topicBadgeText: { fontSize: 12, color: "#4A90D9", fontWeight: "500" },
  diffStars: { fontSize: 12, color: "#F5A623" },
  statusLabel: { fontSize: 12, fontWeight: "500" },
  statusMastered: { color: "#27AE60" },
  statusUnmastered: { color: "#E74C3C" },

  /* Expanded */
  expandedBody: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#F0F0F0", paddingTop: 14 },
  expandLabel: { fontSize: 12, fontWeight: "600", color: "#999", marginTop: 10, marginBottom: 4 },
  expandText: { fontSize: 14, color: "#333", lineHeight: 22 },

  /* Retry */
  retryWrap: { marginTop: 12 },
  retryInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#FAFAFA",
  },
  retrySubmitBtn: {
    backgroundColor: "#4A90D9",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    marginTop: 8,
  },
  retrySubmitText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  retryFeedback: { marginTop: 8, padding: 10, borderRadius: 8 },
  feedbackCorrect: { backgroundColor: "#F0FDF4" },
  feedbackWrong: { backgroundColor: "#FEF2F2" },
  retryFeedbackText: { fontSize: 14, color: "#333", fontWeight: "500" },

  /* Actions */
  actionRow: { flexDirection: "row", marginTop: 14, gap: 16 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { fontSize: 13, color: "#4A90D9", fontWeight: "500" },

  /* Pagination */
  loadMoreBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  loadMoreText: { fontSize: 14, color: "#4A90D9", fontWeight: "600" },
});
