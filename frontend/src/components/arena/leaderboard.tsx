"use client";

import { useArenaStore } from "@/stores/arena";

const TIER_ICONS: Record<string, string> = {
  bronze: "🥉", silver: "🥈", gold: "🥇", diamond: "💎", champion: "👑",
};

export default function ArenaLeaderboard() {
  const { leaderboard } = useArenaStore();

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
      <div className="grid grid-cols-[3rem_1fr_5rem_4rem_4rem] gap-2 px-4 py-2 text-xs font-medium" style={{ color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>
        <span>#</span><span>玩家</span><span>段位</span><span>分数</span><span>胜场</span>
      </div>
      {leaderboard.map((entry, i) => (
        <div
          key={entry.user_id}
          className="grid grid-cols-[3rem_1fr_5rem_4rem_4rem] gap-2 px-4 py-3 items-center text-sm"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <span style={{ color: i < 3 ? "var(--color-primary)" : "var(--color-text-secondary)" }}>
            {i + 1}
          </span>
          <span style={{ color: "var(--color-text)" }}>{entry.phone}</span>
          <span>{TIER_ICONS[entry.tier] || "🥉"} {entry.tier}</span>
          <span style={{ color: "var(--color-text)" }}>{entry.rating}</span>
          <span style={{ color: "var(--color-text-secondary)" }}>{entry.wins}</span>
        </div>
      ))}
      {leaderboard.length === 0 && (
        <p className="text-center py-8 text-sm" style={{ color: "var(--color-text-secondary)" }}>暂无排行数据</p>
      )}
    </div>
  );
}
