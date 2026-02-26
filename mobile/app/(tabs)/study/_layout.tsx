import { Stack } from "expo-router";

export default function StudyLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#1F2937",
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="writing" options={{ title: "写作批改" }} />
      <Stack.Screen name="reading" options={{ title: "阅读材料" }} />
      <Stack.Screen name="reading-detail" options={{ title: "阅读详情" }} />
      <Stack.Screen name="vocabulary" options={{ title: "词汇系统" }} />
      <Stack.Screen name="exam" options={{ title: "考试中心" }} />
      <Stack.Screen name="exam-diagnostic" options={{ title: "诊断测试" }} />
      <Stack.Screen name="exam-mock" options={{ title: "模拟考试" }} />
      <Stack.Screen name="exam-weakness" options={{ title: "弱项突破" }} />
      <Stack.Screen name="exam-training" options={{ title: "分项训练" }} />
      <Stack.Screen name="exam-flow" options={{ title: "心流练习" }} />
      <Stack.Screen name="exam-error-genes" options={{ title: "错误基因" }} />
      <Stack.Screen name="exam-replay" options={{ title: "考场回放" }} />
      <Stack.Screen name="errors" options={{ title: "错题本" }} />
      <Stack.Screen name="clinic" options={{ title: "语法诊所" }} />
      <Stack.Screen name="grammar" options={{ title: "语法专项" }} />
      <Stack.Screen name="screenshot" options={{ title: "截图识题" }} />
      <Stack.Screen name="story" options={{ title: "故事模式" }} />
      <Stack.Screen name="arena" options={{ title: "竞技场" }} />
      <Stack.Screen name="quests" options={{ title: "实战任务" }} />
      <Stack.Screen name="textbook" options={{ title: "教材同步" }} />
      <Stack.Screen name="galaxy" options={{ title: "知识星系" }} />
    </Stack>
  );
}
