import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { useUserStore } from "../../stores/user";
import { useXpStore } from "../../stores/xp";
import { useProgressStore } from "../../stores/progress";
import type { User } from "../../lib/types";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useUserStore();
  const [profile, setProfile] = useState<User | null>(user);
  const { totalXp, level, cefr, streakDays, xpForNext, fetchXp } = useXpStore();
  const { dueVocab, todayPractice, writingCount, errorCount, fetchProgress } = useProgressStore();

  useEffect(() => {
    if (!profile) {
      api.get<User>("/auth/me").then(setProfile).catch(() => {});
    }
    fetchXp();
    fetchProgress();
  }, []);

  function handleLogout() {
    Alert.alert("退出登录", "确定要退出吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "退出",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  }

  const u = profile;
  const xpProgress = xpForNext > 0 ? Math.min((totalXp % xpForNext) / xpForNext, 1) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {u?.phone ? u.phone.slice(-2) : "?"}
          </Text>
        </View>
        <Text style={styles.phone}>{u?.phone || ""}</Text>
      </View>

      {/* XP / Level Card */}
      <View style={styles.card}>
        <View style={styles.xpRow}>
          <View style={styles.xpItem}>
            <Text style={styles.xpNum}>Lv.{level}</Text>
            <Text style={styles.xpLabel}>等级</Text>
          </View>
          <View style={styles.xpItem}>
            <Text style={styles.xpNum}>{totalXp}</Text>
            <Text style={styles.xpLabel}>总经验</Text>
          </View>
          <View style={styles.xpItem}>
            <Text style={styles.xpNum}>{cefr}</Text>
            <Text style={styles.xpLabel}>CEFR</Text>
          </View>
          <View style={styles.xpItem}>
            <Text style={styles.xpNum}>{streakDays}</Text>
            <Text style={styles.xpLabel}>连续天数</Text>
          </View>
        </View>
        <View style={styles.xpBarBg}>
          <View style={[styles.xpBarFill, { width: `${xpProgress * 100}%` }]} />
        </View>
        <Text style={styles.xpHint}>距下一级还需 {xpForNext - (totalXp % xpForNext)} XP</Text>
      </View>

      {/* Profile Info */}
      <View style={styles.card}>
        <InfoRow label="学段" value={u?.grade_level} />
        <InfoRow label="年级" value={u?.grade} />
        <InfoRow label="CEFR 等级" value={u?.cefr_level} />
      </View>

      {/* Learning Stats */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>学习数据</Text>
        <InfoRow label="今日练习" value={String(todayPractice)} />
        <InfoRow label="待复习词汇" value={String(dueVocab)} />
        <InfoRow label="写作提交" value={String(writingCount)} />
        <InfoRow label="错题数" value={String(errorCount)} />
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Feather name="log-out" size={18} color="#EF4444" />
        <Text style={styles.logoutText}>退出登录</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || "--"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { padding: 20, paddingBottom: 40 },
  avatarWrap: { alignItems: "center", marginVertical: 24 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#4A90D9",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "700" },
  phone: { fontSize: 16, color: "#333", marginTop: 8, fontWeight: "500" },
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
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 8 },
  xpRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 12 },
  xpItem: { alignItems: "center" },
  xpNum: { fontSize: 20, fontWeight: "700", color: "#4A90D9" },
  xpLabel: { fontSize: 12, color: "#666", marginTop: 2 },
  xpBarBg: { height: 6, backgroundColor: "#E5E7EB", borderRadius: 3 },
  xpBarFill: { height: 6, backgroundColor: "#4A90D9", borderRadius: 3 },
  xpHint: { fontSize: 12, color: "#999", marginTop: 6, textAlign: "center" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoLabel: { fontSize: 14, color: "#666" },
  infoValue: { fontSize: 14, color: "#333", fontWeight: "500" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    padding: 14,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    gap: 8,
  },
  logoutText: { color: "#EF4444", fontSize: 16, fontWeight: "500" },
});
