import { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useExamStore } from "../../../stores/exam";

const PRIMARY = "#4A90D9";
const BG = "#F5F7FA";
const CARD_BG = "#fff";
const TEXT_PRIMARY = "#333";
const TEXT_SECONDARY = "#666";

const EXAM_TYPES = ["高考", "中考", "四级", "六级"];

const ENTRY_CARDS: {
  title: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  route: string | null;
  scrollToSprint?: boolean;
}[] = [
  { title: "诊断测试", icon: "activity", route: "/study/exam-diagnostic" },
  { title: "模拟考试", icon: "file-text", route: "/study/exam-mock" },
  { title: "弱项突破", icon: "target", route: "/study/exam-weakness" },
  { title: "分项训练", icon: "sliders", route: "/study/exam-training" },
  { title: "心流练习", icon: "zap", route: "/study/exam-flow" },
  { title: "错误基因", icon: "git-branch", route: "/study/exam-error-genes" },
  { title: "考场回放", icon: "rewind", route: "/study/exam-replay" },
  { title: "冲刺计划", icon: "flag", route: null, scrollToSprint: true },
];

export default function ExamScreen() {
  const router = useRouter();
  const {
    profile,
    mastery,
    sprintPlan,
    loading,
    fetchProfile,
    createProfile,
    fetchMastery,
    fetchSprintPlan,
    completeSprintTask,
  } = useExamStore();

  const [formType, setFormType] = useState(EXAM_TYPES[0]);
  const [formProvince, setFormProvince] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formDate, setFormDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const sprintY = useRef(0);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchMastery();
      fetchSprintPlan();
    }
  }, [profile]);

  const handleCreateProfile = useCallback(async () => {
    if (!formProvince.trim()) return Alert.alert("提示", "请输入省份");
    if (!formTarget.trim() || isNaN(Number(formTarget)))
      return Alert.alert("提示", "请输入有效的目标分数");
    if (!formDate.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(formDate.trim()))
      return Alert.alert("提示", "请输入考试日期，格式 YYYY-MM-DD");
    setSubmitting(true);
    try {
      await createProfile({
        exam_type: formType,
        province: formProvince.trim(),
        target_score: Number(formTarget),
        exam_date: formDate.trim(),
      });
      await fetchProfile();
    } catch (e: any) {
      Alert.alert("错误", e.message);
    } finally {
      setSubmitting(false);
    }
  }, [formType, formProvince, formTarget, formDate]);

  const scrollToSprint = () => {
    scrollRef.current?.scrollTo({ y: sprintY.current, animated: true });
  };

  const daysUntilExam = profile
    ? Math.max(
        0,
        Math.ceil(
          (new Date(profile.exam_date).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  // ── Setup form (no profile) ──
  if (!profile && !loading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>设置考试档案</Text>
          <Text style={styles.label}>考试类型</Text>
          <View style={styles.chipRow}>
            {EXAM_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, formType === t && styles.chipActive]}
                onPress={() => setFormType(t)}
              >
                <Text
                  style={[
                    styles.chipText,
                    formType === t && styles.chipTextActive,
                  ]}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>省份</Text>
          <TextInput
            style={styles.input}
            placeholder="例如：北京"
            placeholderTextColor="#999"
            value={formProvince}
            onChangeText={setFormProvince}
          />

          <Text style={styles.label}>目标分数</Text>
          <TextInput
            style={styles.input}
            placeholder="例如：130"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={formTarget}
            onChangeText={setFormTarget}
          />

          <Text style={styles.label}>考试日期</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#999"
            value={formDate}
            onChangeText={setFormDate}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, submitting && { opacity: 0.6 }]}
            onPress={handleCreateProfile}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>创建档案</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (loading && !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  // ── Dashboard (profile exists) ──
  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Countdown Card */}
      <View style={[styles.card, styles.countdownCard]}>
        <View style={styles.countdownRow}>
          <Feather name="clock" size={22} color="#fff" />
          <Text style={styles.countdownLabel}>距离{profile!.exam_type}还有</Text>
        </View>
        <Text style={styles.countdownDays}>{daysUntilExam}</Text>
        <Text style={styles.countdownUnit}>天</Text>
        <Text style={styles.countdownDate}>{profile!.exam_date}</Text>
      </View>

      {/* Score Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>分数概览</Text>
        <View style={styles.scoreRow}>
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreValue}>
              {profile!.current_estimated_score}
            </Text>
            <Text style={styles.scoreLabel}>当前预估</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreBlock}>
            <Text style={[styles.scoreValue, { color: PRIMARY }]}>
              {profile!.target_score}
            </Text>
            <Text style={styles.scoreLabel}>目标分数</Text>
          </View>
          <View style={styles.scoreDivider} />
          <View style={styles.scoreBlock}>
            <Text
              style={[
                styles.scoreValue,
                {
                  color:
                    profile!.target_score - profile!.current_estimated_score > 0
                      ? "#E67E22"
                      : "#27AE60",
                },
              ]}
            >
              {profile!.target_score - profile!.current_estimated_score > 0
                ? `+${profile!.target_score - profile!.current_estimated_score}`
                : "已达标"}
            </Text>
            <Text style={styles.scoreLabel}>差距</Text>
          </View>
        </View>
      </View>

      {/* Section Mastery */}
      {mastery.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>分项掌握度</Text>
          {mastery.map((m) => (
            <View key={m.section} style={styles.masteryItem}>
              <View style={styles.masteryHeader}>
                <Text style={styles.masteryLabel}>{m.label}</Text>
                <Text style={styles.masteryPct}>
                  {Math.round(m.mastery * 100)}%
                </Text>
              </View>
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(m.mastery * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.masteryDetail}>
                {m.practiced_points}/{m.total_points} 知识点已练习
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Sprint Plan */}
      <View
        style={styles.card}
        onLayout={(e) => {
          sprintY.current = e.nativeEvent.layout.y;
        }}
      >
        <View style={styles.sprintHeader}>
          <Text style={styles.cardTitle}>今日冲刺</Text>
          {sprintPlan && (
            <Text style={styles.sprintProgress}>
              {sprintPlan.completed_count}/{sprintPlan.tasks.length}
            </Text>
          )}
        </View>
        {!sprintPlan ? (
          <Text style={styles.emptyText}>暂无冲刺计划</Text>
        ) : (
          sprintPlan.tasks.map((task, i) => (
            <TouchableOpacity
              key={i}
              style={styles.sprintTask}
              onPress={() => {
                if (!task.completed) completeSprintTask(i);
              }}
              activeOpacity={task.completed ? 1 : 0.7}
            >
              <Feather
                name={task.completed ? "check-circle" : "circle"}
                size={20}
                color={task.completed ? "#27AE60" : "#ccc"}
              />
              <Text
                style={[
                  styles.sprintTaskText,
                  task.completed && styles.sprintTaskDone,
                ]}
              >
                {task.title}
              </Text>
              <Text style={styles.sprintXp}>+{task.xp} XP</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Entry Cards Grid */}
      <Text style={styles.sectionHeading}>功能入口</Text>
      <View style={styles.grid}>
        {ENTRY_CARDS.map((item) => (
          <TouchableOpacity
            key={item.title}
            style={styles.entryCard}
            activeOpacity={0.7}
            onPress={() => {
              if (item.scrollToSprint) {
                scrollToSprint();
              } else if (item.route) {
                router.push(item.route as any);
              }
            }}
          >
            <View style={styles.entryIconWrap}>
              <Feather name={item.icon} size={24} color={PRIMARY} />
            </View>
            <Text style={styles.entryTitle}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const screenWidth = Dimensions.get("window").width;
const GRID_GAP = 12;
const GRID_PADDING = 20;
const CARD_WIDTH = (screenWidth - GRID_PADDING * 2 - GRID_GAP) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: GRID_PADDING, paddingBottom: 40 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },

  // ── Card ──
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },

  // ── Setup Form ──
  label: { fontSize: 14, fontWeight: "600", color: TEXT_PRIMARY, marginTop: 14, marginBottom: 6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#F9FAFB",
  },
  chipActive: { borderColor: PRIMARY, backgroundColor: "#EBF3FB" },
  chipText: { fontSize: 14, color: TEXT_SECONDARY },
  chipTextActive: { color: PRIMARY, fontWeight: "600" },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: TEXT_PRIMARY,
  },
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 20,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },

  // ── Countdown ──
  countdownCard: {
    backgroundColor: PRIMARY,
    alignItems: "center",
    paddingVertical: 24,
  },
  countdownRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  countdownLabel: { color: "#fff", fontSize: 14, marginLeft: 6, opacity: 0.9 },
  countdownDays: { color: "#fff", fontSize: 56, fontWeight: "800", lineHeight: 64 },
  countdownUnit: { color: "#fff", fontSize: 16, opacity: 0.85, marginTop: -4 },
  countdownDate: { color: "#fff", fontSize: 13, opacity: 0.7, marginTop: 6 },

  // ── Score ──
  scoreRow: { flexDirection: "row", alignItems: "center" },
  scoreBlock: { flex: 1, alignItems: "center" },
  scoreDivider: { width: 1, height: 40, backgroundColor: "#E5E7EB" },
  scoreValue: { fontSize: 28, fontWeight: "700", color: TEXT_PRIMARY },
  scoreLabel: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 4 },

  // ── Mastery ──
  masteryItem: { marginBottom: 14 },
  masteryHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  masteryLabel: { fontSize: 14, fontWeight: "500", color: TEXT_PRIMARY },
  masteryPct: { fontSize: 14, fontWeight: "600", color: PRIMARY },
  progressBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E8EDF2",
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
  },
  masteryDetail: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 4 },

  // ── Sprint ──
  sprintHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sprintProgress: { fontSize: 14, fontWeight: "600", color: PRIMARY },
  sprintTask: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8EDF2",
  },
  sprintTaskText: { flex: 1, fontSize: 14, color: TEXT_PRIMARY, marginLeft: 10 },
  sprintTaskDone: { textDecorationLine: "line-through", color: "#aaa" },
  sprintXp: { fontSize: 12, fontWeight: "600", color: "#E67E22" },
  emptyText: { fontSize: 14, color: TEXT_SECONDARY, textAlign: "center", paddingVertical: 20 },

  // ── Entry Grid ──
  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    marginTop: 6,
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  entryCard: {
    width: CARD_WIDTH,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: GRID_GAP,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  entryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EBF3FB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  entryTitle: { fontSize: 14, fontWeight: "600", color: TEXT_PRIMARY },
});
