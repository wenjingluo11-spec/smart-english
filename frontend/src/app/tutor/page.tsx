"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "@/components/chat/message";
import { streamChat } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function TutorPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm your AI English tutor. How can I help you today? 你好！我是你的 AI 英语导师，有什么可以帮你的？",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      await streamChat(text, history, (chunk) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = { ...last, content: last.content + chunk };
          return updated;
        });
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "抱歉，连接出现问题，请稍后再试。",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">AI 英语导师</h2>
      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 p-4 mb-4">
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
          placeholder="输入你的问题..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          disabled={streaming}
        />
        <button
          onClick={handleSend}
          disabled={streaming}
          className="bg-blue-500 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {streaming ? "..." : "发送"}
        </button>
      </div>
    </div>
  );
}
