import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";

const TABS = [
  { name: "index", title: "主页", icon: "home" as const },
  { name: "tutor", title: "AI 导师", icon: "message-circle" as const },
  { name: "practice", title: "题库", icon: "edit-3" as const },
  { name: "study", title: "学习", icon: "book-open" as const },
  { name: "profile", title: "我的", icon: "user" as const },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#1F2937",
        tabBarActiveTintColor: "#3B82F6",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: { borderTopColor: "#E5E7EB" },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <Feather name={tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
