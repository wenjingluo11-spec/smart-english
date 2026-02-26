"use client";

import { useEffect, useState } from "react";
import { useQuestsStore } from "@/stores/quests";
import QuestCard from "@/components/quests/quest-card";
import QuestDetail from "@/components/quests/quest-detail";

export default function QuestsPage() {
  const { available, myQuests, community, fetchAvailable, fetchMyQuests, fetchCommunity } = useQuestsStore();
  const [tab, setTab] = useState<"available" | "my" | "community">("available");
  const [selectedQuest, setSelectedQuest] = useState<number | null>(null);

  useEffect(() => {
    fetchAvailable();
    fetchMyQuests();
    fetchCommunity();
  }, [fetchAvailable, fetchMyQuests, fetchCommunity]);

  if (selectedQuest !== null) {
    const quest = available.find((q) => q.id === selectedQuest);
    const userQuest = myQuests.find((q) => q.template_id === selectedQuest);
    if (quest) {
      return (
        <div className="max-w-3xl mx-auto">
          <QuestDetail quest={quest} userQuest={userQuest} onBack={() => setSelectedQuest(null)} />
        </div>
      );
    }
  }

  const activeQuests = myQuests.filter((q) => q.status === "active" || q.status === "submitted");
  const completedQuests = myQuests.filter((q) => q.status === "verified");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>🌍 真实任务</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          在真实场景中使用英语，AI 验证你的完成情况
        </p>
      </div>

      <div className="flex gap-2">
        {(["available", "my", "community"] as const).map((t) => (
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
            {t === "available" ? "任务大厅" : t === "my" ? `我的任务 (${activeQuests.length})` : "社区展示"}
          </button>
        ))}
      </div>

      {tab === "available" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {available.map((q) => (
            <QuestCard key={q.id} quest={q} onClick={() => setSelectedQuest(q.id)} />
          ))}
          {available.length === 0 && (
            <p className="col-span-2 text-center py-8" style={{ color: "var(--color-text-secondary)" }}>暂无可用任务</p>
          )}
        </div>
      )}

      {tab === "my" && (
        <div className="space-y-4">
          {activeQuests.length > 0 && (
            <div>
              <h2 className="text-sm font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>进行中</h2>
              <div className="space-y-3">
                {activeQuests.map((q) => (
                  <div key={q.id} onClick={() => setSelectedQuest(q.template_id)}
                    className="p-4 rounded-xl cursor-pointer" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm" style={{ color: "var(--color-text)" }}>{q.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#dbeafe", color: "#1e40af" }}>{q.status === "submitted" ? "审核中" : "进行中"}</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>+{q.xp_reward} XP</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {completedQuests.length > 0 && (
            <div>
              <h2 className="text-sm font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>已完成</h2>
              <div className="space-y-3">
                {completedQuests.map((q) => (
                  <div key={q.id} className="p-4 rounded-xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm" style={{ color: "var(--color-text)" }}>{q.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#dcfce7", color: "#166534" }}>已完成</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {myQuests.length === 0 && (
            <p className="text-center py-8" style={{ color: "var(--color-text-secondary)" }}>还没有接受任何任务</p>
          )}
        </div>
      )}

      {tab === "community" && (
        <div className="space-y-3">
          {community.map((c, i) => (
            <div key={i} className="p-4 rounded-xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{c.quest_title}</span>
                <span className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>{c.score}分</span>
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                {"⭐".repeat(c.difficulty)} · {new Date(c.completed_at).toLocaleDateString()}
              </p>
            </div>
          ))}
          {community.length === 0 && (
            <p className="text-center py-8" style={{ color: "var(--color-text-secondary)" }}>暂无社区展示</p>
          )}
        </div>
      )}
    </div>
  );
}
