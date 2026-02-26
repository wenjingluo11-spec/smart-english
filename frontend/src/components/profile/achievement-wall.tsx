"use client";

interface AchievementItem {
  key: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at: string;
}

export default function AchievementWall({ achievements }: { achievements: AchievementItem[] }) {
  if (achievements.length === 0) {
    return (
      <div className="text-center py-6 text-sm" style={{ color: "var(--color-text-secondary)" }}>
        完成学习任务解锁成就徽章
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-3">
      {achievements.map((a, i) => (
        <div
          key={a.key}
          className="rounded-xl border p-3 text-center animate-slide-up"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
            animationDelay: `${i * 0.05}s`,
          }}
        >
          <div className="text-2xl mb-1">{a.icon}</div>
          <div className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{a.name}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>{a.description}</div>
        </div>
      ))}
    </div>
  );
}
