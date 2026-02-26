import { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useGalaxyStore } from "../../../stores/galaxy";

const STATUS_LABELS: Record<string, string> = {
  mastered: "已掌握",
  familiar: "熟悉",
  seen: "已见",
  undiscovered: "未发现",
};

const STATUS_COLORS: Record<string, string> = {
  mastered: "#22C55E",
  familiar: "#3B82F6",
  seen: "#F59E0B",
  undiscovered: "#9CA3AF",
};

export default function GalaxyScreen() {
  const {
    nodes, stats, selectedNode, relatedNodes, loading,
    fetchView, fetchStats, selectNode, learnNode, exploreNode,
  } = useGalaxyStore();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetchStats();
    fetchView();
  }, []);

  const grouped = {
    mastered: nodes.filter((n) => n.status === "mastered"),
    familiar: nodes.filter((n) => n.status === "familiar"),
    seen: nodes.filter((n) => n.status === "seen"),
    undiscovered: nodes.filter((n) => n.status === "undiscovered"),
  };

  async function handleTap(id: number) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    await selectNode(id);
  }

  async function handleLearn(id: number, status: string) {
    await learnNode(id, status);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Stats Card */}
      {stats && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>知识星系概览</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${stats.progress_pct}%` }]} />
          </View>
          <Text style={styles.progressText}>探索进度 {stats.progress_pct.toFixed(1)}%</Text>
          <View style={styles.statsRow}>
            <StatBadge label="总词汇" value={stats.total_nodes} color="#333" />
            <StatBadge label="已掌握" value={stats.mastered} color="#22C55E" />
            <StatBadge label="熟悉" value={stats.familiar} color="#3B82F6" />
            <StatBadge label="已见" value={stats.seen} color="#F59E0B" />
          </View>
        </View>
      )}

      {loading && <ActivityIndicator size="large" color="#4A90D9" style={{ marginVertical: 20 }} />}

      {/* Word Groups */}
      {(["mastered", "familiar", "seen", "undiscovered"] as const).map((status) => {
        const words = grouped[status];
        if (words.length === 0) return null;
        return (
          <View key={status} style={{ marginTop: 16 }}>
            <View style={styles.groupHeader}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
              <Text style={styles.groupTitle}>{STATUS_LABELS[status]}</Text>
              <Text style={styles.groupCount}>{words.length}</Text>
            </View>
            {words.map((node) => (
              <TouchableOpacity
                key={node.id}
                style={styles.wordCard}
                onPress={() => handleTap(node.id)}
                activeOpacity={0.7}
              >
                <View style={styles.wordRow}>
                  <Text style={styles.word}>{node.word}</Text>
                  <View style={[styles.posBadge, { backgroundColor: STATUS_COLORS[node.status] + "20" }]}>
                    <Text style={[styles.posText, { color: STATUS_COLORS[node.status] }]}>{node.pos}</Text>
                  </View>
                  <View style={[styles.cefrBadge]}>
                    <Text style={styles.cefrText}>{node.cefr_level}</Text>
                  </View>
                  <Feather name={expandedId === node.id ? "chevron-up" : "chevron-down"} size={16} color="#999" />
                </View>
                <Text style={styles.definition} numberOfLines={expandedId === node.id ? undefined : 1}>
                  {node.definition}
                </Text>

                {expandedId === node.id && selectedNode?.id === node.id && (
                  <View style={styles.expandedSection}>
                    {node.example_sentence && (
                      <View style={styles.exampleCard}>
                        <Feather name="message-circle" size={14} color="#4A90D9" />
                        <Text style={styles.exampleText}>{node.example_sentence}</Text>
                      </View>
                    )}

                    {relatedNodes.length > 0 && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={styles.relatedTitle}>关联词汇</Text>
                        <View style={styles.relatedRow}>
                          {relatedNodes.slice(0, 6).map((r) => (
                            <TouchableOpacity
                              key={r.id}
                              style={styles.relatedChip}
                              onPress={() => handleTap(r.id)}
                            >
                              <Text style={styles.relatedChipText}>{r.word}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    <View style={styles.actionRow}>
                      {node.status !== "seen" && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#F59E0B20" }]} onPress={() => handleLearn(node.id, "seen")}>
                          <Text style={[styles.actionBtnText, { color: "#F59E0B" }]}>已见</Text>
                        </TouchableOpacity>
                      )}
                      {node.status !== "familiar" && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#3B82F620" }]} onPress={() => handleLearn(node.id, "familiar")}>
                          <Text style={[styles.actionBtnText, { color: "#3B82F6" }]}>熟悉</Text>
                        </TouchableOpacity>
                      )}
                      {node.status !== "mastered" && (
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "#22C55E20" }]} onPress={() => handleLearn(node.id, "mastered")}>
                          <Text style={[styles.actionBtnText, { color: "#22C55E" }]}>掌握</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: "#4A90D920" }]}
                        onPress={() => exploreNode(node.id)}
                      >
                        <Feather name="compass" size={14} color="#4A90D9" />
                        <Text style={[styles.actionBtnText, { color: "#4A90D9", marginLeft: 4 }]}>探索</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        );
      })}

      {!loading && nodes.length === 0 && (
        <View style={styles.emptyCard}>
          <Feather name="globe" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>暂无词汇数据</Text>
          <Text style={styles.emptySubtext}>完成更多练习后，知识星系将逐步展开</Text>
        </View>
      )}
    </ScrollView>
  );
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statBadge}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: "#333", marginBottom: 12 },
  progressBarBg: { height: 8, backgroundColor: "#E5E7EB", borderRadius: 4 },
  progressBarFill: { height: 8, backgroundColor: "#4A90D9", borderRadius: 4 },
  progressText: { fontSize: 12, color: "#666", marginTop: 6, marginBottom: 12 },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  statBadge: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 11, color: "#666", marginTop: 2 },
  groupHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, paddingHorizontal: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  groupTitle: { fontSize: 15, fontWeight: "600", color: "#333" },
  groupCount: { fontSize: 13, color: "#999", marginLeft: 6 },
  wordCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  wordRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  word: { fontSize: 16, fontWeight: "600", color: "#333" },
  posBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  posText: { fontSize: 11, fontWeight: "500" },
  cefrBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: "#F3F4F6" },
  cefrText: { fontSize: 11, color: "#666", fontWeight: "500" },
  definition: { fontSize: 13, color: "#666", marginTop: 6, lineHeight: 18 },
  expandedSection: { marginTop: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 12 },
  exampleCard: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "#F0F7FF", borderRadius: 8, padding: 10 },
  exampleText: { fontSize: 13, color: "#333", flex: 1, lineHeight: 18 },
  relatedTitle: { fontSize: 13, fontWeight: "600", color: "#333", marginBottom: 6 },
  relatedRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  relatedChip: { backgroundColor: "#F3F4F6", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  relatedChipText: { fontSize: 12, color: "#4A90D9", fontWeight: "500" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  actionBtnText: { fontSize: 13, fontWeight: "500" },
  emptyCard: { alignItems: "center", marginTop: 60 },
  emptyText: { fontSize: 16, color: "#999", marginTop: 12 },
  emptySubtext: { fontSize: 13, color: "#BBB", marginTop: 4 },
});
