"use client";

import { useState } from "react";
import { useArenaStore } from "@/stores/arena";

export default function BattleRoom() {
  const { currentBattle, lastRoundResult, submitRound, clearBattle, loading } = useArenaStore();
  const [input, setInput] = useState("");

  if (!currentBattle) return null;

  const rounds = currentBattle.rounds?.rounds || [];
  const currentRound = currentBattle.rounds?.current_round || 0;
  const maxRounds = currentBattle.rounds?.max_rounds || 5;
  const isFinished = currentBattle.status === "finished";

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    await submitRound(currentBattle.id, input);
    setInput("");
  };

  const p1Total = rounds.reduce((s, r) => s + r.p1_score, 0);
  const p2Total = rounds.reduce((s, r) => s + r.p2_score, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={clearBattle}
          className="text-sm px-3 py-1.5 rounded-lg"
          style={{ background: "var(--color-card)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
        >
          ← 退出
        </button>
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{currentBattle.mode}</p>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            回合 {currentRound}/{maxRounds}
          </p>
        </div>
        <div className="text-right text-sm" style={{ color: "var(--color-text)" }}>
          <span style={{ color: "#3b82f6" }}>{p1Total}</span>
          {" : "}
          <span style={{ color: "#ef4444" }}>{p2Total}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full" style={{ background: "var(--color-bg)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${(currentRound / maxRounds) * 100}%`, background: "var(--color-primary)" }} />
      </div>

      {/* Round history */}
      <div className="space-y-3">
        {rounds.map((r) => (
          <div key={r.round} className="rounded-xl p-4" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>回合 {r.round}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs mb-1" style={{ color: "#3b82f6" }}>你 (+{r.p1_score})</p>
                <p className="text-sm" style={{ color: "var(--color-text)" }}>{r.p1_input}</p>
                {r.p1_feedback && <p className="text-xs mt-1 italic" style={{ color: "var(--color-text-secondary)" }}>{r.p1_feedback}</p>}
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "#ef4444" }}>AI (+{r.p2_score})</p>
                <p className="text-sm" style={{ color: "var(--color-text)" }}>{r.p2_input}</p>
                {r.p2_feedback && <p className="text-xs mt-1 italic" style={{ color: "var(--color-text-secondary)" }}>{r.p2_feedback}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input or result */}
      {!isFinished ? (
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的回应..."
            className="flex-1 px-4 py-3 rounded-xl text-sm"
            style={{ background: "var(--color-card)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={loading}
          />
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || loading}
            className="px-6 py-3 rounded-xl text-white text-sm font-medium"
            style={{ background: "var(--color-primary)", opacity: !input.trim() || loading ? 0.5 : 1 }}
          >
            {loading ? "..." : "发送"}
          </button>
        </div>
      ) : (
        <div className="text-center py-6 rounded-xl" style={{ background: "var(--color-primary-light)" }}>
          <p className="text-3xl mb-2">{p1Total > p2Total ? "🎉" : p1Total === p2Total ? "🤝" : "😤"}</p>
          <p className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>
            {p1Total > p2Total ? "你赢了！" : p1Total === p2Total ? "平局！" : "再接再厉！"}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            最终比分 {p1Total} : {p2Total}
          </p>
          <button
            onClick={clearBattle}
            className="mt-4 px-6 py-2 rounded-lg text-white text-sm"
            style={{ background: "var(--color-primary)" }}
          >
            返回大厅
          </button>
        </div>
      )}
    </div>
  );
}
