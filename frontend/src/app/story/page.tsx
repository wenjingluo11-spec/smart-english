"use client";

import { useEffect, useState } from "react";
import { useStoryStore } from "@/stores/story";
import StoryReader from "@/components/story/story-reader";
import TemplateCard from "@/components/story/template-card";

export default function StoryPage() {
  const { templates, sessions, currentSession, fetchTemplates, fetchSessions, loadSession } = useStoryStore();
  const [tab, setTab] = useState<"templates" | "my">("templates");

  useEffect(() => {
    fetchTemplates();
    fetchSessions();
  }, [fetchTemplates, fetchSessions]);

  if (currentSession) {
    return <StoryReader />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>🎭 互动故事</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          沉浸式英语故事，你的选择决定剧情走向
        </p>
      </div>

      <div className="flex gap-2">
        {(["templates", "my"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-sm"
            style={{
              background: tab === t ? "var(--color-primary)" : "var(--color-card)",
              color: tab === t ? "white" : "var(--color-text-secondary)",
              border: `1px solid ${tab === t ? "var(--color-primary)" : "var(--color-border)"}`,
            }}
          >
            {t === "templates" ? "故事库" : `我的故事 (${sessions.length})`}
          </button>
        ))}
      </div>

      {tab === "templates" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
          {templates.length === 0 && (
            <p className="col-span-2 text-center py-8" style={{ color: "var(--color-text-secondary)" }}>暂无故事模板</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => loadSession(s.id)}
              className="p-4 rounded-xl cursor-pointer flex items-center gap-4 transition-colors hover:opacity-80"
              style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
            >
              <span className="text-3xl">{s.cover_emoji || "📖"}</span>
              <div className="flex-1">
                <p className="font-medium" style={{ color: "var(--color-text)" }}>{s.template_title}</p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                  第 {s.current_chapter} 章 · {s.status === "active" ? "进行中" : s.status === "completed" ? "已完成" : "已放弃"}
                </p>
              </div>
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {new Date(s.started_at).toLocaleDateString()}
              </span>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="text-center py-8" style={{ color: "var(--color-text-secondary)" }}>还没有开始任何故事</p>
          )}
        </div>
      )}
    </div>
  );
}
