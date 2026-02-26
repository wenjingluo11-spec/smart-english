import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import type { VocabWord } from "../../../lib/types";

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  new: { label: "新词", bg: "#EFF6FF", color: "#3B82F6" },
  learning: { label: "学习中", bg: "#FEF3C7", color: "#D97706" },
  mastered: { label: "已掌握", bg: "#F0FDF4", color: "#059669" },
};

export default function VocabularyScreen() {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newWord, setNewWord] = useState("");
  const [newDef, setNewDef] = useState("");
  const [adding, setAdding] = useState(false);

  function fetchWords() {
    api
      .get<VocabWord[]>("/vocabulary/")
      .then(setWords)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchWords();
  }, []);

  async function handleAdd() {
    if (!newWord.trim() || !newDef.trim())
      return Alert.alert("提示", "请填写单词和释义");
    setAdding(true);
    try {
      await api.post("/vocabulary/add", {
        word: newWord.trim(),
        definition: newDef.trim(),
      });
      setNewWord("");
      setNewDef("");
      setShowAdd(false);
      fetchWords();
    } catch (e: any) {
      Alert.alert("错误", e.message);
    } finally {
      setAdding(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addToggle}
        onPress={() => setShowAdd(!showAdd)}
      >
        <Feather name={showAdd ? "x" : "plus"} size={18} color="#3B82F6" />
        <Text style={styles.addToggleText}>
          {showAdd ? "取消" : "添加生词"}
        </Text>
      </TouchableOpacity>

      {showAdd && (
        <View style={styles.addForm}>
          <TextInput
            style={styles.addInput}
            placeholder="单词"
            placeholderTextColor="#9CA3AF"
            value={newWord}
            onChangeText={setNewWord}
          />
          <TextInput
            style={styles.addInput}
            placeholder="释义"
            placeholderTextColor="#9CA3AF"
            value={newDef}
            onChangeText={setNewDef}
          />
          <TouchableOpacity
            style={[styles.addBtn, adding && { opacity: 0.6 }]}
            onPress={handleAdd}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.addBtnText}>添加</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={words}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>暂无生词</Text>
          </View>
        }
        renderItem={({ item }) => {
          const status = STATUS_MAP[item.status] || STATUS_MAP.new;
          return (
            <View style={styles.wordCard}>
              <View style={styles.wordHeader}>
                <Text style={styles.wordText}>{item.word}</Text>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {status.label}
                  </Text>
                </View>
              </View>
              <Text style={styles.defText}>{item.definition}</Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { color: "#9CA3AF", fontSize: 15 },
  addToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 16,
    paddingBottom: 0,
  },
  addToggleText: { color: "#3B82F6", fontSize: 15, fontWeight: "500" },
  addForm: { padding: 16, gap: 10 },
  addInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: "#1F2937",
  },
  addBtn: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  list: { padding: 16, paddingTop: 8 },
  wordCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  wordHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  wordText: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "500" },
  defText: { fontSize: 14, color: "#6B7280", marginTop: 4 },
});
