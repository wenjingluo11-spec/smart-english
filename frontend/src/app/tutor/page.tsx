"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "@/components/chat/message";
import ModeSelector from "@/components/chat/mode-selector";
import PageTransition from "@/components/ui/page-transition";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const MODE_GREETINGS: Record<string, string> = {
  free: "Hi! I'm your AI English tutor. How can I help you today? 你好！我是你的 AI 英语导师，有什么可以帮你的？",
  grammar: "Welcome to the Grammar Clinic! 欢迎来到语法诊所！请输入一个英文句子，我来帮你分析语法。",
  speaking: "Let's practice speaking! 来练习口语吧！你想模拟什么场景？餐厅点餐、机场出行、面试、还是购物？",
  explain: "Paste any English question here and I'll explain it step by step! 粘贴任何英语题目，我来详细讲解。",
};

export default function TutorPage() {
  const [mode, setMode] = useState("free");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: MODE_GREETINGS.free },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleModeChange = (newMode: string) => {
    setMode(newMode);
    setMessages([{ role: "assistant", content: MODE_GREETINGS[newMode] || MODE_GREETINGS.free }]);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, history, mode }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              updated[updated.length - 1] = { ...last, content: last.content + data };
              return updated;
            });
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "抱歉，连接出现问题，请稍后再试。" };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <PageTransition stagger>
      <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
        <h2 className="text-xl font-semibold mb-3" style={{ color: "var(--color-text)" }}>AI 英语导师</h2>
        <ModeSelector current={mode} onSelect={handleModeChange} />
        <div
          className="flex-1 overflow-y-auto rounded-xl border p-4 mb-4"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          {messages.map((msg, i) => (
            <ChatMessage key={i} role={msg.role} content={msg.content} />
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)" }}
            placeholder="输入你的问题..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={streaming}
          />
          <button
            onClick={handleSend}
            disabled={streaming}
            className="text-white px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
            style={{ background: "var(--color-primary)" }}
          >
            {streaming ? "..." : "发送"}
          </button>
        </div>
      </div>
    </PageTransition>
  );
}
