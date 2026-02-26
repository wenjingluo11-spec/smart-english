"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import ReviewSession from "@/components/vocabulary/review-session";
import WordDetail from "@/components/vocabulary/word-detail";
import PageTransition from "@/components/ui/page-transition";
import Skeleton from "@/components/ui/skeleton";

import { EmptyBook } from "@/components/ui/empty-illustrations";

interface VocabWord {
  id: number;
  word: string;
  definition: string;
  status: string;
  next_review_at: string | null;
}

interface DueWord {
  id: number;
  word: string;
  definition: string;
  status: string;
}

export default function VocabularyPage() {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [dueWords, setDueWords] = useState<DueWord[]>([]);
  const [newWord, setNewWord] = useState("");
  const [newDef, setNewDef] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewMode, setReviewMode] = useState(false);
  const [detailWord, setDetailWord] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; new: number; learning: number; mastered: number } | null>(null);

  const fetchWords = () => {
    api.get<VocabWord[]>("/vocabulary/")
      .then(setWords)
      .catch(() => setWords([]))
      .finally(() => setLoading(false));
  };

  const fetchDue = () => {
    api.get<DueWord[]>("/vocabulary/due")
      .then(setDueWords)
      .catch(() => setDueWords([]));
  };

  useEffect(() => {
    fetchWords();
    fetchDue();
    api.get<typeof stats>("/vocabulary/stats").then(setStats).catch(() => {});
  }, []);

  const handleAdd = async () => {
    if (!newWord.trim()) return;
    try {
      await api.post("/vocabulary/add", { word: newWord.trim(), definition: newDef.trim() });
      setNewWord("");
      setNewDef("");
      setShowAdd(false);
      fetchWords();
      fetchDue();
    } catch { /* ignore */ }
  };

  const statusLabel: Record<string, string> = { new: "新词", learning: "学习中", mastered: "已掌握" };
  const statusStyle: Record<string, { bg: string; color: string }> = {
    mastered: { bg: "#dcfce7", color: "#22c55e" },
    learning: { bg: "#fef9c3", color: "#ca8a04" },
    new: { bg: "var(--color-surface-hover)", color: "var(--color-text-secondary)" },
  };

  if (reviewMode && dueWords.length > 0) {
    return (
      <PageTransition>
        <div className="max-w-3xl">
          <button
            onClick={() => { setReviewMode(false); fetchWords(); fetchDue(); }}
            className="text-sm mb-4 hover:underline"
            style={{ color: "var(--color-primary)" }}
          >
            ← 返回词汇列表
          </button>
          <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--color-text)" }}>间隔复习</h2>
          <ReviewSession words={dueWords} onComplete={() => { setReviewMode(false); fetchWords(); fetchDue(); }} />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition stagger>
      <div className="max-w-3xl">
        <h2 className="text-hero text-gradient mb-4">词汇系统</h2>

        {/* Stats bar */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { label: "总词汇", value: stats.total, gradient: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(6,182,212,0.08))", border: "rgba(59,130,246,0.15)", numColor: "#3b82f6" },
              { label: "新词", value: stats.new, gradient: "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(132,204,22,0.08))", border: "rgba(34,197,94,0.15)", numColor: "#22c55e" },
              { label: "学习中", value: stats.learning, gradient: "linear-gradient(135deg, rgba(234,179,8,0.1), rgba(249,115,22,0.08))", border: "rgba(234,179,8,0.15)", numColor: "#ca8a04" },
              { label: "已掌握", value: stats.mastered, gradient: "linear-gradient(135deg, rgba(167,139,250,0.1), rgba(192,132,252,0.08))", border: "rgba(167,139,250,0.15)", numColor: "#a78bfa" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl p-3 text-center transition-all duration-200 hover:-translate-y-0.5 shadow-theme-sm" style={{ background: s.gradient, border: `1px solid ${s.border}` }}>
                <div className="text-title font-bold" style={{ color: s.numColor }}>{s.value}</div>
                <div className="text-caption">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mb-4">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="text-white px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 shadow-theme-sm"
            style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
          >
            添加生词
          </button>
          {dueWords.length > 0 && (
            <button
              onClick={() => setReviewMode(true)}
              className="px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.1), rgba(var(--color-accent-rgb), 0.06))", color: "var(--color-primary)", border: "1px solid rgba(var(--color-primary-rgb), 0.2)" }}
            >
              复习模式 ({dueWords.length} 词待复习)
            </button>
          )}
        </div>

        {showAdd && (
          <div className="card-gradient-vocab p-4 mb-4 flex gap-3 items-end animate-slide-up shadow-theme-sm">
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>单词</label>
              <input className="input-field"
                value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="apple" />
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>释义</label>
              <input className="input-field"
                value={newDef} onChange={(e) => setNewDef(e.target.value)} placeholder="苹果" />
            </div>
            <button onClick={handleAdd} className="text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:brightness-110 active:scale-[0.97] cursor-pointer shadow-theme-sm"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}>
              保存
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3"><Skeleton className="h-14 w-full rounded-xl" /><Skeleton className="h-14 w-full rounded-xl" /><Skeleton className="h-14 w-full rounded-xl" /></div>
        ) : words.length === 0 ? (
          <div className="card-gradient-vocab p-8 text-center shadow-theme-sm flex flex-col items-center">
            <EmptyBook />
            <div className="text-body mt-2" style={{ color: "var(--color-text-secondary)" }}>生词本为空，点击上方按钮添加生词</div>
          </div>
        ) : (
          <div className="glass-card overflow-hidden shadow-theme-sm">
            {words.map((w, i) => {
              const s = statusStyle[w.status] || statusStyle.new;
              const barColor = w.status === "mastered" ? "#22c55e" : w.status === "learning" ? "#eab308" : "#3b82f6";
              return (
                <div key={w.id}
                  className="px-4 py-3.5 flex justify-between items-center cursor-pointer transition-all duration-200"
                  style={{
                    borderLeft: `3px solid ${barColor}`,
                    borderBottom: i < words.length - 1 ? "1px solid var(--color-border)" : "none",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(90deg, rgba(var(--color-primary-rgb), 0.04), transparent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  onClick={() => setDetailWord(w.word)}>
                  <div>
                    <span className="font-medium" style={{ color: "var(--color-text)" }}>{w.word}</span>
                    {w.definition && <span className="text-sm ml-3" style={{ color: "var(--color-text-secondary)" }}>{w.definition}</span>}
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: s.bg, color: s.color }}>
                    {statusLabel[w.status] || w.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Word detail modal */}
        {detailWord && <WordDetail word={detailWord} onClose={() => setDetailWord(null)} />}
      </div>
    </PageTransition>
  );
}
