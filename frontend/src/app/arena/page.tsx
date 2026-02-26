"use client";

import { useEffect, useState } from "react";
import { useArenaStore } from "@/stores/arena";
import BattleRoom from "@/components/arena/battle-room";
import ArenaLeaderboard from "@/components/arena/leaderboard";

const TIER_ICONS: Record<string, string> = {
  bronze: "🥉", silver: "🥈", gold: "🥇", diamond: "💎", champion: "👑",
};

export default function ArenaPage() {
  const { modes, currentBattle, rating, fetchModes, fetchRating, fetchLeaderboard, startBattle, loading } = useArenaStore();
  const [tab, setTab] = useState<"modes" | "leaderboard" | "history">("modes");

  useEffect(() => {
    fetchModes();
    fetchRating();
    fetchLeaderboard();
  }, [fetchModes, fetchRating, fetchLeaderboard]);

  if (currentBattle && currentBattle.status !== "finished") {
    return <BattleRoom />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>⚔️ 英语对战</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            与 AI 对手实时英语对决，提升段位
          </p>
        </div>
        {rating && (
          <div className="text-right">
            <div className="text-2xl">{TIER_ICONS[rating.tier] || "🥉"}</div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{rating.rating} 分</p>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {rating.wins}胜 {rating.losses}负
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {(["modes", "leaderboard", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === "history") useArenaStore.getState().fetchHistory(); }}
            className="px-4 py-2 rounded-lg text-sm"
            style={{
              background: tab === t ? "var(--color-primary)" : "var(--color-card)",
              color: tab === t ? "white" : "var(--color-text-secondary)",
              border: `1px solid ${tab === t ? "var(--color-primary)" : "var(--color-border)"}`,
            }}
          >
            {t === "modes" ? "对战模式" : t === "leaderboard" ? "排行榜" : "历史"}
          </button>
        ))}
      </div>

      {tab === "modes" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {modes.map((m) => (
            <div key={m.mode} className="rounded-xl p-5" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
              <h3 className="font-semibold" style={{ color: "var(--color-text)" }}>{m.name}</h3>
              <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>{m.description}</p>
              <p className="text-xs mt-2" style={{ color: "var(--color-text-secondary)" }}>{m.rounds} 回合</p>
              <button
                onClick={() => startBattle(m.mode)}
                disabled={loading}
                className="mt-3 w-full py-2 rounded-lg text-white text-sm font-medium"
                style={{ background: "var(--color-primary)", opacity: loading ? 0.6 : 1 }}
              >
                {loading ? "匹配中..." : "开始对战"}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === "leaderboard" && <ArenaLeaderboard />}

      {tab === "history" && (
        <div className="space-y-3">
          {useArenaStore.getState().history.map((b) => {
            const rounds = b.rounds?.rounds || [];
            const p1Total = rounds.reduce((s, r) => s + r.p1_score, 0);
            const p2Total = rounds.reduce((s, r) => s + r.p2_score, 0);
            return (
              <div key={b.id} className="p-4 rounded-xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{b.mode}</span>
                  <span className="text-sm" style={{ color: p1Total > p2Total ? "#16a34a" : "#dc2626" }}>
                    {p1Total > p2Total ? "胜利" : p1Total === p2Total ? "平局" : "失败"} ({p1Total} : {p2Total})
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                  {new Date(b.created_at).toLocaleDateString()} · {rounds.length} 回合
                </p>
              </div>
            );
          })}
          {useArenaStore.getState().history.length === 0 && (
            <p className="text-center py-8" style={{ color: "var(--color-text-secondary)" }}>暂无对战记录</p>
          )}
        </div>
      )}
    </div>
  );
}
