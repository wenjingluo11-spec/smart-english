import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { api } from "../../../lib/api";
import type { ReadingMaterial } from "../../../lib/types";

export default function ReadingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [material, setMaterial] = useState<ReadingMaterial | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api
      .get<ReadingMaterial>(`/reading/${id}`)
      .then(setMaterial)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!material) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>未找到材料</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{material.title}</Text>
      <View style={styles.meta}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{material.cefr_level}</Text>
        </View>
        <Text style={styles.metaText}>{material.word_count} 词</Text>
      </View>
      <Text style={styles.body}>{material.content}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#9CA3AF", fontSize: 15 },
  title: { fontSize: 22, fontWeight: "700", color: "#1F2937", marginBottom: 8 },
  meta: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  badge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: { fontSize: 13, color: "#3B82F6", fontWeight: "600" },
  metaText: { fontSize: 13, color: "#6B7280" },
  body: { fontSize: 16, color: "#374151", lineHeight: 28 },
});
