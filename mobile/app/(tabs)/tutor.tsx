import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { streamChat } from "../../lib/api";
import type { ChatMessage } from "../../lib/types";

export default function TutorScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const listRef = useRef<FlatList>(null);

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setStreaming(true);

    let assistantContent = "";
    const assistantMsg: ChatMessage = { role: "assistant", content: "" };
    setMessages([...history, assistantMsg]);

    try {
      await streamChat(text, messages, (chunk) => {
        assistantContent += chunk;
        setMessages([...history, { role: "assistant", content: assistantContent }]);
      });
    } catch {
      assistantContent = assistantContent || "抱歉，连接出现问题，请重试。";
      setMessages([...history, { role: "assistant", content: assistantContent }]);
    } finally {
      setStreaming(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isUser = item.role === "user";
          return (
            <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
              <Text style={isUser ? styles.userText : styles.aiText}>
                {item.content}
              </Text>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="message-circle" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>和 AI 导师开始对话吧</Text>
          </View>
        }
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="输入消息..."
          placeholderTextColor="#9CA3AF"
          value={input}
          onChangeText={setInput}
          multiline
          editable={!streaming}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || streaming) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || streaming}
        >
          {streaming ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  list: { padding: 16, paddingBottom: 8, flexGrow: 1 },
  bubble: { maxWidth: "80%", padding: 12, borderRadius: 16, marginBottom: 10 },
  userBubble: {
    backgroundColor: "#3B82F6",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "#F3F4F6",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  userText: { color: "#fff", fontSize: 15, lineHeight: 22 },
  aiText: { color: "#1F2937", fontSize: 15, lineHeight: 22 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { color: "#9CA3AF", fontSize: 15 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: "#1F2937",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.5 },
});
