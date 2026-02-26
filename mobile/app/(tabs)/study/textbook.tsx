import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTextbookStore } from "../../../stores/textbook";

type ViewMode = "picker" | "units" | "detail";

export default function TextbookScreen() {
  const router = useRouter();
  const {
    textbooks,
    units,
    currentTextbook,
    currentUnitId,
    unitDetail,
    loading,
    fetchTextbooks,
    fetchUnits,
    fetchUnitDetail,
    fetchMySetting,
  } = useTextbookStore();

  const [view, setView] = useState<ViewMode>("picker");
  const [selectedTextbookName, setSelectedTextbookName] = useState("");

  useEffect(() => {
    fetchTextbooks();
    fetchMySetting();
  }, []);

  const handleSelectTextbook = useCallback(
    async (id: number, name: string) => {
      setSelectedTextbookName(name);
      await fetchUnits(id);
      setView("units");
    },
    [fetchUnits]
  );

  const handleSelectUnit = useCallback(
    async (unitId: number) => {
      await fetchUnitDetail(unitId);
      setView("detail");
    },
    [fetchUnitDetail]
  );

  const handleBackToPicker = useCallback(() => {
    setView("picker");
    setSelectedTextbookName("");
  }, []);

  const handleBackToUnits = useCallback(() => {
    setView("units");
  }, []);

  // ── Detail View ──
  if (view === "detail" && unitDetail) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.navHeader}>
          <TouchableOpacity onPress={handleBackToUnits} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#4A90D9" />
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>
            Unit {unitDetail.unit_number}: {unitDetail.title}
          </Text>
        </View>

        {/* Topic */}
        <View style={styles.card}>
          <View style={styles.topicRow}>
            <Feather name="bookmark" size={16} color="#4A90D9" />
            <Text style={styles.topicText}>{unitDetail.topic}</Text>
          </View>
        </View>

        {/* Vocabulary */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Feather name="book-open" size={16} color="#4A90D9" />
            <Text style={styles.sectionTitle}>词汇 ({unitDetail.vocabulary.length})</Text>
          </View>
          {unitDetail.vocabulary.length === 0 ? (
            <Text style={styles.emptyHint}>暂无词汇</Text>
          ) : (
            unitDetail.vocabulary.map((word, i) => (
              <View key={i} style={styles.listItem}>
                <View style={styles.listDot} />
                <Text style={styles.listText}>{word}</Text>
              </View>
            ))
          )}
        </View>

        {/* Grammar Points */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Feather name="edit-3" size={16} color="#F59E0B" />
            <Text style={styles.sectionTitle}>语法点 ({unitDetail.grammar_points.length})</Text>
          </View>
          {unitDetail.grammar_points.length === 0 ? (
            <Text style={styles.emptyHint}>暂无语法点</Text>
          ) : (
            unitDetail.grammar_points.map((point, i) => (
              <View key={i} style={styles.listItem}>
                <View style={[styles.listDot, { backgroundColor: "#F59E0B" }]} />
                <Text style={styles.listText}>{point}</Text>
              </View>
            ))
          )}
        </View>

        {/* Key Sentences */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Feather name="message-circle" size={16} color="#16A34A" />
            <Text style={styles.sectionTitle}>重点句型 ({unitDetail.key_sentences.length})</Text>
          </View>
          {unitDetail.key_sentences.length === 0 ? (
            <Text style={styles.emptyHint}>暂无重点句型</Text>
          ) : (
            unitDetail.key_sentences.map((sentence, i) => (
              <View key={i} style={styles.sentenceItem}>
                <Text style={styles.sentenceNumber}>{i + 1}</Text>
                <Text style={styles.sentenceText}>{sentence}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  }

  // ── Units View ──
  if (view === "units") {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.navHeader}>
          <TouchableOpacity onPress={handleBackToPicker} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color="#4A90D9" />
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>
            {selectedTextbookName}
          </Text>
        </View>

        {units.length === 0 && !loading && (
          <View style={styles.emptyWrap}>
            <Feather name="layers" size={40} color="#CCC" />
            <Text style={styles.emptyText}>暂无单元数据</Text>
          </View>
        )}

        {units.map((unit) => (
          <TouchableOpacity
            key={unit.id}
            style={[
              styles.card,
              currentUnitId === unit.id && styles.cardHighlight,
            ]}
            onPress={() => handleSelectUnit(unit.id)}
            activeOpacity={0.7}
          >
            <View style={styles.unitHeader}>
              <View style={styles.unitNumberBadge}>
                <Text style={styles.unitNumberText}>U{unit.unit_number}</Text>
              </View>
              <View style={styles.unitInfo}>
                <Text style={styles.unitTitle} numberOfLines={1}>
                  {unit.title}
                </Text>
                <Text style={styles.unitTopic} numberOfLines={1}>
                  {unit.topic}
                </Text>
              </View>
              {currentUnitId === unit.id && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>当前</Text>
                </View>
              )}
            </View>
            <View style={styles.unitStats}>
              <View style={styles.unitStat}>
                <Feather name="book-open" size={13} color="#4A90D9" />
                <Text style={styles.unitStatText}>{unit.vocab_count} 词汇</Text>
              </View>
              <View style={styles.unitStat}>
                <Feather name="edit-3" size={13} color="#F59E0B" />
                <Text style={styles.unitStatText}>{unit.grammar_count} 语法</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#CCC" />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  }

  // ── Picker View ──
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Current textbook indicator */}
      {currentTextbook && (
        <View style={styles.currentCard}>
          <View style={styles.currentCardHeader}>
            <Feather name="check-circle" size={16} color="#16A34A" />
            <Text style={styles.currentLabel}>当前教材</Text>
          </View>
          <Text style={styles.currentName}>{currentTextbook.name}</Text>
          <Text style={styles.currentMeta}>
            {currentTextbook.publisher} | {currentTextbook.grade} | {currentTextbook.semester}
          </Text>
        </View>
      )}

      {/* Title */}
      <Text style={styles.pageTitle}>选择教材</Text>

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#4A90D9" />
        </View>
      )}

      {textbooks.length === 0 && !loading && (
        <View style={styles.emptyWrap}>
          <Feather name="book" size={40} color="#CCC" />
          <Text style={styles.emptyText}>暂无教材</Text>
        </View>
      )}

      {textbooks.map((tb) => (
        <TouchableOpacity
          key={tb.id}
          style={[
            styles.card,
            currentTextbook?.id === tb.id && styles.cardHighlight,
          ]}
          onPress={() => handleSelectTextbook(tb.id, tb.name)}
          activeOpacity={0.7}
        >
          <View style={styles.tbHeader}>
            <View style={styles.tbIcon}>
              <Feather name="book" size={24} color="#4A90D9" />
            </View>
            <View style={styles.tbInfo}>
              <Text style={styles.tbName} numberOfLines={1}>
                {tb.name}
              </Text>
              <Text style={styles.tbPublisher}>{tb.publisher}</Text>
            </View>
            {currentTextbook?.id === tb.id && (
              <Feather name="check-circle" size={18} color="#16A34A" />
            )}
          </View>
          <View style={styles.tbMeta}>
            <View style={styles.tbMetaBadge}>
              <Text style={styles.tbMetaText}>{tb.grade}</Text>
            </View>
            <View style={styles.tbMetaBadge}>
              <Text style={styles.tbMetaText}>{tb.semester}</Text>
            </View>
          </View>
          <View style={styles.tbFooter}>
            <Text style={styles.tbFooterText}>查看单元</Text>
            <Feather name="chevron-right" size={16} color="#4A90D9" />
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { padding: 16, paddingBottom: 32 },

  /* Nav header */
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: { marginRight: 10 },
  navTitle: { fontSize: 18, fontWeight: "600", color: "#333", flex: 1 },

  /* Page title */
  pageTitle: { fontSize: 20, fontWeight: "700", color: "#333", marginBottom: 16 },

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
  cardHighlight: { borderWidth: 1.5, borderColor: "#4A90D9" },

  /* Current textbook */
  currentCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  currentCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  currentLabel: { fontSize: 13, fontWeight: "600", color: "#16A34A" },
  currentName: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 4 },
  currentMeta: { fontSize: 13, color: "#666" },

  /* Textbook card */
  tbHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  tbIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EBF3FC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  tbInfo: { flex: 1 },
  tbName: { fontSize: 16, fontWeight: "600", color: "#333" },
  tbPublisher: { fontSize: 13, color: "#666", marginTop: 2 },
  tbMeta: { flexDirection: "row", gap: 8, marginBottom: 10 },
  tbMetaBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tbMetaText: { fontSize: 12, fontWeight: "500", color: "#666" },
  tbFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  tbFooterText: { fontSize: 13, color: "#4A90D9", fontWeight: "500" },

  /* Unit card */
  unitHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  unitNumberBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#4A90D9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  unitNumberText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  unitInfo: { flex: 1 },
  unitTitle: { fontSize: 15, fontWeight: "600", color: "#333" },
  unitTopic: { fontSize: 13, color: "#666", marginTop: 2 },
  currentBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  currentBadgeText: { fontSize: 11, fontWeight: "600", color: "#16A34A" },
  unitStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  unitStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  unitStatText: { fontSize: 13, color: "#666" },

  /* Detail sections */
  topicRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  topicText: { fontSize: 15, color: "#333", fontWeight: "500" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },
  listDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4A90D9",
    marginRight: 10,
  },
  listText: { fontSize: 14, color: "#333", flex: 1, lineHeight: 22 },
  sentenceItem: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },
  sentenceNumber: {
    width: 24,
    fontSize: 13,
    fontWeight: "600",
    color: "#4A90D9",
  },
  sentenceText: { fontSize: 14, color: "#333", flex: 1, lineHeight: 22 },
  emptyHint: { fontSize: 14, color: "#999", textAlign: "center", paddingVertical: 16 },

  /* Loading / Empty */
  loadingWrap: { paddingVertical: 40, alignItems: "center" },
  emptyWrap: { alignItems: "center", paddingVertical: 48 },
  emptyText: { fontSize: 14, color: "#999", marginTop: 12 },
});
