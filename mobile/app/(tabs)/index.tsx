import { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useUserStore } from "../../stores/user";
import { useXpStore } from "../../stores/xp";
import { useProgressStore } from "../../stores/progress";
import { useMissionsStore } from "../../stores/missions";

const CARDS = [
  { title: "AI 导师", desc: "智能英语对话练习", icon: "message-circle" as const, route: "/tutor" },
  { title: "智能题库", desc: "自适应练习题", icon: "edit-3" as const, route: "/practice" },
  { title: "考试中心", desc: "诊断·模考·冲刺", icon: "award" as const, route: "/study/exam" },
  { title: "写作批改", desc: "AI 作文评分反馈", icon: "file-text" as const, route: "/study/writing" },
  { title: "阅读理解", desc: "分级阅读材料", icon: "book" as const, route: "/study/reading" },
  { title: "错题本", desc: "错题回顾与巩固", icon: "alert-circle" as const, route: "/study/errors" },
  { title: "语法诊所", desc: "AI 诊断错误模式", icon: "activity" as const, route: "/study/clinic" },
  { title: "截图识题", desc: "拍照生成练习", icon: "camera" as const, route: "/study/screenshot" },
];

export default function Dashboard() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const { totalXp, level, streakDays, xpForNext, loaded: xpLoaded, fetchXp } = useXpStore();
  const { todayPractice, fetchProgress } = useProgressStore();
  const { missions, fetchMissions } = useMissionsStore();

  useEffect(() => {
    fetchXp();
    fetchProgress();
    fetchMissions();
  }, []);

  const xpProgress = xpForNext > 0 ? Math.min((totalXp % xpForNext) / xpForNext, 1) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>
        {user ? `${user.grade_level} · ${user.grade}` : "欢迎使用"}
      </Text>
      <Text style={styles.title}>Smart English</Text>

      {/* XP / Level / Streak Bar */}
      {xpLoaded && (
        <View style={styles.xpCard}>
          <View style={styles.xpRow}>
            <View style={styles.xpItem}>
              <Feather name="star" size={18} color="#F59E0B" />
              <Text style={styles.xpNum}>Lv.{level}</Text>
              <Text style={styles.xpLabel}>等级</Text>
            </View>
            <View style={styles.xpItem}>
              <Feather name="zap" size={18} color="#4A90D9" />
              <Text style={styles.xpNum}>{totalXp}</Text>
              <Text style={styles.xpLabel}>经验值</Text>
            </View>
            <View style={styles.xpItem}>
              <Feather name="trending-up" size={18} color="#22C55E" />
              <Text style={styles.xpNum}>{streakDays}</Text>
              <Text style={styles.xpLabel}>连续天数</Text>
            </View>
          </View>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${xpProgress * 100}%` }]} />
          </View>
        </View>
      )}

      {/* Feature Grid */}
      <View style={styles.grid}>
        {CARDS.map((card) => (
          <TouchableOpacity
            key={card.title}
            style={styles.card}
            onPress={() => router.push(card.route as any)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrap}>
              <Feather name={card.icon} size={24} color="#4A90D9" />
            </View>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardDesc}>{card.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>学习概览</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{todayPractice}</Text>
            <Text style={styles.statLabel}>今日练习</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{streakDays}</Text>
            <Text style={styles.statLabel}>连续天数</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{user?.cefr_level || "--"}</Text>
            <Text style={styles.statLabel}>当前等级</Text>
          </View>
        </View>
      </View>

      {/* Daily Missions */}
      {missions.length > 0 && (
        <View style={styles.missionsCard}>
          <Text style={styles.statsTitle}>每日任务</Text>
          {missions.map((m) => (
            <View key={m.id} style={styles.missionRow}>
              <Feather
                name={m.completed ? "check-circle" : "circle"}
                size={20}
                color={m.completed ? "#22C55E" : "#D1D5DB"}
              />
              <View style={styles.missionBody}>
                <Text style={[styles.missionTitle, m.completed && styles.missionDone]}>
                  {m.title}
                </Text>
                <View style={styles.missionBarBg}>
                  <View
                    style={[
                      styles.missionBarFill,
                      { width: `${Math.min((m.progress / m.target) * 100, 100)}%` },
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.missionXp}>+{m.xp_reward}XP</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { padding: 20, paddingBottom: 40 },
  greeting: { fontSize: 14, color: "#666", marginTop: 8 },
  title: { fontSize: 24, fontWeight: "700", color: "#333", marginBottom: 16 },
  xpCard: {
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
  xpRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 12 },
  xpItem: { alignItems: "center", gap: 4 },
  xpNum: { fontSize: 18, fontWeight: "700", color: "#333" },
  xpLabel: { fontSize: 11, color: "#666" },
  xpBarBg: { height: 6, backgroundColor: "#E5E7EB", borderRadius: 3 },
  xpBarFill: { height: 6, backgroundColor: "#4A90D9", borderRadius: 3 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "48%" as any,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#EBF3FB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  cardDesc: { fontSize: 12, color: "#666", marginTop: 4 },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statsTitle: { fontSize: 16, fontWeight: "600", color: "#333", marginBottom: 12 },
  statsRow: { flexDirection: "row", justifyContent: "space-around" },
  statItem: { alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "700", color: "#4A90D9" },
  statLabel: { fontSize: 12, color: "#666", marginTop: 4 },
  missionsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  missionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 10,
  },
  missionBody: { flex: 1 },
  missionTitle: { fontSize: 14, color: "#333", marginBottom: 4 },
  missionDone: { textDecorationLine: "line-through", color: "#9CA3AF" },
  missionBarBg: { height: 4, backgroundColor: "#E5E7EB", borderRadius: 2 },
  missionBarFill: { height: 4, backgroundColor: "#4A90D9", borderRadius: 2 },
  missionXp: { fontSize: 12, fontWeight: "600", color: "#F59E0B" },
});
