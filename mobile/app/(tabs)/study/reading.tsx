import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { api } from "../../../lib/api";
import type { ReadingMaterial } from "../../../lib/types";

export default function ReadingListScreen() {
  const router = useRouter();
  const [materials, setMaterials] = useState<ReadingMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ReadingMaterial[]>("/reading/materials")
      .then(setMaterials)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={materials}
      keyExtractor={(item) => String(item.id)}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>暂无阅读材料</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            router.push({ pathname: "/study/reading-detail", params: { id: item.id } } as any)
          }
          activeOpacity={0.7}
        >
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={styles.meta}>
              <Text style={styles.metaText}>{item.word_count} 词</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.cefr_level}</Text>
              </View>
            </View>
          </View>
          <Feather name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  list: { padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { color: "#9CA3AF", fontSize: 15 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
  meta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  metaText: { fontSize: 13, color: "#6B7280" },
  badge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { fontSize: 12, color: "#3B82F6", fontWeight: "600" },
});
