"use client";

import { useState } from "react";
import { useStoryStore } from "@/stores/story";
import ChallengeModal from "@/components/story/challenge-modal";

export default function StoryReader() {
  const { currentSession, currentChapter, allChapters, makeChoice, loading } = useStoryStore();
  const [showChallenge, setShowChallenge] = useState(false);

  if (!currentSession || !currentChapter) return null;

  const isEnded = currentSession.status === "completed";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => useStoryStore.setState({ currentSession: null, currentChapter: null, allChapters: [] })}
          className="text-sm px-3 py-1.5 rounded-lg"
          style={{ background: "var(--color-card)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
        >
          ← 返回
        </button>
        <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          第 {currentChapter.chapter_number} 章
        </span>
      </div>

      {/* Previous chapters (collapsed) */}
      {allChapters.length > 1 && (
        <details className="rounded-xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <summary className="p-3 cursor-pointer text-sm" style={{ color: "var(--color-text-secondary)" }}>
            查看之前的章节 ({allChapters.length - 1} 章)
          </summary>
          <div className="px-4 pb-4 space-y-4">
            {allChapters.slice(0, -1).map((ch) => (
              <div key={ch.id} className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                <p className="font-medium mb-1" style={{ color: "var(--color-text)" }}>第 {ch.chapter_number} 章</p>
                <p className="whitespace-pre-wrap">{ch.narrative_text}</p>
                {ch.chosen_option && <p className="mt-1 italic">选择了: {ch.chosen_option}</p>}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Current chapter narrative */}
      <div className="rounded-xl p-6" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
        <p className="leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
          {currentChapter.narrative_text}
        </p>

        {/* Learning points */}
        {currentChapter.learning_points && currentChapter.learning_points.length > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
            <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>📚 本章学习点</p>
            <div className="flex flex-wrap gap-2">
              {currentChapter.learning_points.map((lp, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
                  {lp.word}: {lp.meaning}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Challenge button */}
      {currentChapter.challenge && !isEnded && (
        <button
          onClick={() => setShowChallenge(true)}
          className="w-full py-3 rounded-xl text-sm font-medium"
          style={{ background: "#fef9c3", color: "#854d0e", border: "1px solid #fde047" }}
        >
          🎯 完成英语挑战获取额外 XP
        </button>
      )}

      {/* Choices */}
      {!isEnded && currentChapter.choices && currentChapter.choices.length > 0 && !currentChapter.chosen_option && (
        <div className="space-y-3">
          <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>你的选择：</p>
          {currentChapter.choices.map((c) => (
            <button
              key={c.label}
              onClick={() => makeChoice(c.label)}
              disabled={loading}
              className="w-full text-left p-4 rounded-xl transition-colors hover:opacity-80"
              style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", opacity: loading ? 0.6 : 1 }}
            >
              <span className="font-medium" style={{ color: "var(--color-primary)" }}>{c.label}. </span>
              <span style={{ color: "var(--color-text)" }}>{c.description}</span>
            </button>
          ))}
          {loading && <p className="text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>AI 正在生成下一章...</p>}
        </div>
      )}

      {isEnded && (
        <div className="text-center py-6 rounded-xl" style={{ background: "var(--color-primary-light)" }}>
          <p className="text-2xl mb-2">🎉</p>
          <p className="font-bold" style={{ color: "var(--color-primary)" }}>故事完结！</p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>共 {currentSession.total_chapters} 章</p>
        </div>
      )}

      {showChallenge && currentChapter.challenge && (
        <ChallengeModal
          challenge={currentChapter.challenge}
          chapterId={currentChapter.id}
          onClose={() => setShowChallenge(false)}
        />
      )}
    </div>
  );
}
