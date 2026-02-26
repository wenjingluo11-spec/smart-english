import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

const ITEMS = [
  { title: "考试中心", desc: "诊断、模考、弱项突破", icon: "award" as const, route: "/study/exam" },
  { title: "错题本", desc: "错题回顾与巩固", icon: "alert-circle" as const, route: "/study/errors" },
  { title: "语法诊所", desc: "AI 诊断错误模式", icon: "activity" as const, route: "/study/clinic" },
  { title: "语法专项", desc: "分类语法学习与练习", icon: "grid" as const, route: "/study/grammar" },
  { title: "写作批改", desc: "提交作文获取 AI 评分和修改建议", icon: "file-text" as const, route: "/study/writing" },
  { title: "阅读理解", desc: "分级阅读材料，提升阅读能力", icon: "book" as const, route: "/study/reading" },
  { title: "词汇系统", desc: "管理生词本，科学复习", icon: "layers" as const, route: "/study/vocabulary" },
  { title: "截图识题", desc: "拍照或截图，AI 生成练习", icon: "camera" as const, route: "/study/screenshot" },
  { title: "故事模式", desc: "互动故事阅读与选择", icon: "book-open" as const, route: "/study/story" },
  { title: "竞技场", desc: "英语对战，排行榜竞技", icon: "zap" as const, route: "/study/arena" },
  { title: "实战任务", desc: "真实场景英语任务", icon: "target" as const, route: "/study/quests" },
  { title: "教材同步", desc: "同步课本单元与知识点", icon: "bookmark" as const, route: "/study/textbook" },
  { title: "知识星系", desc: "词汇关联与掌握度总览", icon: "star" as const, route: "/study/galaxy" },
];

export default function StudyIndex() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>学习中心</Text>
      {ITEMS.map((item) => (
        <TouchableOpacity
          key={item.title}
          style={styles.card}
          onPress={() => router.push(item.route as any)}
          activeOpacity={0.7}
        >
          <View style={styles.iconWrap}>
            <Feather name={item.icon} size={24} color="#4A90D9" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FA" },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "700", color: "#333", marginBottom: 20 },
  card: {
    flexDirection: "row",
    alignItems: "center",
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
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EBF3FB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#333" },
  cardDesc: { fontSize: 13, color: "#666", marginTop: 2 },
});
