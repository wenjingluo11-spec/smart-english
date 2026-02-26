"use client";

const DIFFICULTY_LABELS = ["", "⭐ 日常", "⭐⭐ 挑战", "⭐⭐⭐ 史诗"];
const CATEGORY_LABELS: Record<string, string> = {
  digital: "📱 数字", writing: "✍️ 写作", social: "💬 社交", media: "🎬 媒体",
};

interface Props {
  quest: {
    id: number; title: string; description: string; difficulty: number;
    category: string; xp_reward: number; user_status?: string;
  };
  onClick: () => void;
}

export default function QuestCard({ quest, onClick }: Props) {
  const isDone = quest.user_status === "verified";
  const isActive = quest.user_status === "active" || quest.user_status === "submitted";

  return (
    <div
      onClick={onClick}
      className="rounded-xl p-5 cursor-pointer transition-colors hover:opacity-90"
      style={{
        background: "var(--color-card)",
        border: `1px solid ${isDone ? "#86efac" : isActive ? "#93c5fd" : "var(--color-border)"}`,
        opacity: isDone ? 0.7 : 1,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
          {CATEGORY_LABELS[quest.category] || quest.category}
        </span>
        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {DIFFICULTY_LABELS[quest.difficulty] || "⭐"}
        </span>
        {isDone && <span className="text-xs ml-auto" style={{ color: "#16a34a" }}>✅ 已完成</span>}
        {isActive && <span className="text-xs ml-auto" style={{ color: "#2563eb" }}>进行中</span>}
      </div>
      <h3 className="font-medium" style={{ color: "var(--color-text)" }}>{quest.title}</h3>
      <p className="text-sm mt-1 line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>{quest.description}</p>
      <p className="text-xs mt-2 font-medium" style={{ color: "var(--color-primary)" }}>+{quest.xp_reward} XP</p>
    </div>
  );
}
