/**
 * 移动端认知增强反馈组件 — 展示学霸审题思路、关键线索、陷阱、方法论。
 */

import { View, Text, StyleSheet } from "react-native";
import type { SubmitResult } from "../../lib/types";
import AudioPlayer from "./AudioPlayer";

interface CognitiveFeedbackProps {
  result: SubmitResult;
}

export default function CognitiveFeedback({ result }: CognitiveFeedbackProps) {
  const { how_to_spot, key_clues, common_trap, method, analysis } = result;
  const hasContent = how_to_spot || (key_clues && key_clues.length > 0) || common_trap || method;

  if (!hasContent) return null;

  return (
    <View style={styles.container}>
      {/* 学霸怎么看的 */}
      {how_to_spot ? (
        <View style={styles.spotCard}>
          <View style={styles.spotHeader}>
            <Text style={styles.spotTitle}>🎯 学霸怎么看的</Text>
            <AudioPlayer text={how_to_spot} compact label="听" />
          </View>
          <Text style={styles.spotText}>{how_to_spot}</Text>
        </View>
      ) : null}

      {/* 关键线索 */}
      {key_clues && key_clues.length > 0 ? (
        <View style={styles.cluesCard}>
          <Text style={styles.sectionLabel}>关键线索</Text>
          {key_clues.map((clue, i) => (
            <View key={i} style={styles.clueRow}>
              <Text style={styles.clueArrow}>▸</Text>
              <Text style={styles.clueContent}>
                <Text style={styles.clueText}>{clue.text}</Text>
                <Text style={styles.clueDash}> — </Text>
                <Text style={styles.clueRole}>{clue.role}</Text>
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* 常见陷阱 + 解题方法 */}
      {(common_trap || method) ? (
        <View style={styles.twoColRow}>
          {common_trap ? (
            <View style={[styles.miniCard, styles.trapCard]}>
              <Text style={styles.trapTitle}>常见陷阱</Text>
              <Text style={styles.miniCardText}>{common_trap}</Text>
            </View>
          ) : null}
          {method ? (
            <View style={[styles.miniCard, styles.methodCard]}>
              <Text style={styles.methodTitle}>解题方法</Text>
              <Text style={styles.miniCardText}>{method}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 审题顺序 */}
      {analysis?.reading_order && analysis.reading_order.length > 0 ? (
        <View style={styles.orderCard}>
          <Text style={styles.sectionLabel}>审题顺序</Text>
          {analysis.reading_order.map((step) => (
            <View key={step.step} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNum}>{step.step}</Text>
              </View>
              <Text style={styles.stepContent}>
                <Text style={styles.stepTarget}>{step.target}</Text>
                <Text style={styles.stepArrow}> → </Text>
                <Text style={styles.stepAction}>{step.action}</Text>
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, marginTop: 10 },

  // 学霸审题
  spotCard: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(59,130,246,0.06)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.15)",
  },
  spotHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  spotTitle: { fontSize: 12, fontWeight: "700", color: "#2563EB" },
  spotText: { fontSize: 14, lineHeight: 20, color: "#374151" },

  // 关键线索
  cluesCard: { padding: 14, borderRadius: 12, backgroundColor: "#F9FAFB" },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280", marginBottom: 8 },
  clueRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginBottom: 4 },
  clueArrow: { color: "#3B82F6", fontSize: 12, marginTop: 2 },
  clueContent: { flex: 1, fontSize: 13 },
  clueText: { fontWeight: "600", color: "#2563EB" },
  clueDash: { color: "#9CA3AF" },
  clueRole: { color: "#6B7280" },

  // 陷阱 + 方法
  twoColRow: { flexDirection: "row", gap: 8 },
  miniCard: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 1 },
  trapCard: { backgroundColor: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.15)" },
  methodCard: { backgroundColor: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.15)" },
  trapTitle: { fontSize: 11, fontWeight: "700", color: "#D97706", marginBottom: 4 },
  methodTitle: { fontSize: 11, fontWeight: "700", color: "#059669", marginBottom: 4 },
  miniCardText: { fontSize: 13, color: "#374151", lineHeight: 18 },

  // 审题顺序
  orderCard: { padding: 14, borderRadius: 12, backgroundColor: "#F9FAFB" },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: { color: "#fff", fontSize: 11, fontWeight: "700" },
  stepContent: { flex: 1, fontSize: 13 },
  stepTarget: { fontWeight: "600", color: "#374151" },
  stepArrow: { color: "#9CA3AF" },
  stepAction: { color: "#6B7280" },
});
