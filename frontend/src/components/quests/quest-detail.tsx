"use client";

import { useState, useCallback } from "react";
import { useQuestsStore } from "@/stores/quests";
import { api } from "@/lib/api";

interface Props {
  quest: {
    id: number; title: string; description: string; difficulty: number;
    category: string; requirements: Record<string, unknown> | null;
    tips: Record<string, unknown> | null; xp_reward: number;
  };
  userQuest?: {
    id: number; status: string; evidence_url: string | null;
    ai_verification: Record<string, unknown> | null;
  };
  onBack: () => void;
}

export default function QuestDetail({ quest, userQuest, onBack }: Props) {
  const { startQuest, submitEvidence, loading } = useQuestsStore();
  const [uploading, setUploading] = useState(false);
  const [verification, setVerification] = useState<Record<string, unknown> | null>(
    userQuest?.ai_verification || null
  );

  const handleStart = async () => {
    await startQuest(quest.id);
  };

  const handleUpload = useCallback(async (file: File) => {
    if (!userQuest) return;
    setUploading(true);
    try {
      const uploadRes = await api.upload<{ url: string }>("/upload/image", file);
      const result = await submitEvidence(userQuest.id, uploadRes.url);
      setVerification(result);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "上传失败");
    }
    setUploading(false);
  }, [userQuest, submitEvidence]);

  const tips = quest.tips as { tips?: string[] } | null;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm px-3 py-1.5 rounded-lg"
        style={{ background: "var(--color-card)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
        ← 返回
      </button>

      <div className="rounded-xl p-6" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
            {"⭐".repeat(quest.difficulty)}
          </span>
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{quest.category}</span>
          <span className="ml-auto text-sm font-medium" style={{ color: "var(--color-primary)" }}>+{quest.xp_reward} XP</span>
        </div>

        <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{quest.title}</h2>
        <p className="text-sm mt-2" style={{ color: "var(--color-text)" }}>{quest.description}</p>

        {quest.requirements && (
          <div className="mt-4 p-3 rounded-lg" style={{ background: "var(--color-bg)" }}>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>任务要求</p>
            <p className="text-sm" style={{ color: "var(--color-text)" }}>
              {(quest.requirements as { description?: string }).description || JSON.stringify(quest.requirements)}
            </p>
          </div>
        )}

        {tips?.tips && tips.tips.length > 0 && (
          <div className="mt-3 p-3 rounded-lg" style={{ background: "#fef9c3" }}>
            <p className="text-xs font-medium mb-1" style={{ color: "#854d0e" }}>💡 AI 提示</p>
            {tips.tips.map((tip, i) => (
              <p key={i} className="text-sm" style={{ color: "#854d0e" }}>• {tip}</p>
            ))}
          </div>
        )}
      </div>

      {/* Action area */}
      {!userQuest && (
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full py-3 rounded-xl text-white font-medium"
          style={{ background: "var(--color-primary)", opacity: loading ? 0.6 : 1 }}
        >
          接受任务
        </button>
      )}

      {userQuest && userQuest.status === "active" && (
        <div className="rounded-xl p-6" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <h3 className="font-medium mb-3" style={{ color: "var(--color-text)" }}>提交证据</h3>
          <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
            上传截图证明你完成了任务，AI 将自动验证
          </p>
          <label
            className="block w-full py-8 border-2 border-dashed rounded-xl text-center cursor-pointer"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
            {uploading ? "上传验证中..." : "📸 点击上传截图证据"}
          </label>
        </div>
      )}

      {verification && (
        <div
          className="p-4 rounded-xl"
          style={{
            background: verification.passed ? "#dcfce7" : "#fef2f2",
            border: `1px solid ${verification.passed ? "#86efac" : "#fca5a5"}`,
          }}
        >
          <p className="font-medium" style={{ color: verification.passed ? "#166534" : "#991b1b" }}>
            {verification.passed ? "✅ 任务验证通过！" : "❌ 验证未通过"}
          </p>
          <p className="text-sm mt-1" style={{ color: verification.passed ? "#166534" : "#991b1b" }}>
            {String(verification.feedback || "")}
          </p>
          {verification.score !== undefined && (
            <p className="text-sm mt-1 font-medium" style={{ color: verification.passed ? "#166534" : "#991b1b" }}>
              得分：{String(verification.score)}
            </p>
          )}
        </div>
      )}

      {userQuest?.status === "verified" && !verification && (
        <div className="text-center py-6 rounded-xl" style={{ background: "#dcfce7" }}>
          <p className="text-2xl mb-2">🎉</p>
          <p className="font-bold" style={{ color: "#166534" }}>任务已完成！</p>
        </div>
      )}
    </div>
  );
}
