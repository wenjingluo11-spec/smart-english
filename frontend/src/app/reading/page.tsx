"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import ReadingQuiz from "@/components/reading/reading-quiz";
import ReadingProgressBar from "@/components/reading/progress-bar";
import PageTransition from "@/components/ui/page-transition";
import Skeleton from "@/components/ui/skeleton";

import { EmptyTelescope } from "@/components/ui/empty-illustrations";

interface ReadingMaterial {
  id: number;
  title: string;
  cefr_level: string;
  grade: string;
  word_count: number;
  content?: string;
  questions_json?: { questions?: { question: string; options: string[]; answer: number; explanation?: string }[] } | null;
}

const CEFR_LEVELS = ["全部", "A1", "A2", "B1", "B2", "C1"];
const CEFR_GRADIENTS: Record<string, string> = {
  A1: "linear-gradient(135deg, #22c55e, #84cc16)",
  A2: "linear-gradient(135deg, #84cc16, #06b6d4)",
  B1: "linear-gradient(135deg, #3b82f6, #6366f1)",
  B2: "linear-gradient(135deg, #a78bfa, #c084fc)",
  C1: "linear-gradient(135deg, #f97316, #ef4444)",
};

export default function ReadingPage() {
  const [materials, setMaterials] = useState<ReadingMaterial[]>([]);
  const [selected, setSelected] = useState<ReadingMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuiz, setShowQuiz] = useState(false);
  const [filterLevel, setFilterLevel] = useState("全部");
  const [readHistory, setReadHistory] = useState<Set<number>>(new Set());
  const [fontSize, setFontSize] = useState(14);

  useEffect(() => {
    api.get<ReadingMaterial[]>("/reading/materials")
      .then(setMaterials)
      .catch(() => setMaterials([]))
      .finally(() => setLoading(false));
  }, []);

  const openMaterial = async (id: number) => {
    try {
      const detail = await api.get<ReadingMaterial>(`/reading/${id}`);
      setSelected(detail);
      setShowQuiz(false);
      setReadHistory((prev) => new Set(prev).add(id));
    } catch { /* ignore */ }
  };

  const filtered = filterLevel === "全部"
    ? materials
    : materials.filter((m) => m.cefr_level === filterLevel);

  const questions = selected?.questions_json?.questions || [];

  if (selected) {
    return (
      <PageTransition stagger>
        <div className="max-w-3xl">
          <ReadingProgressBar />
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setSelected(null)}
              className="text-sm hover:underline font-medium"
              style={{ color: "var(--color-primary)" }}
            >
              ← 返回列表
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFontSize(Math.max(12, fontSize - 1))}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all hover:shadow-theme-sm"
                style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}
              >
                A-
              </button>
              <button
                onClick={() => setFontSize(Math.min(20, fontSize + 1))}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all hover:shadow-theme-sm"
                style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}
              >
                A+
              </button>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-theme-sm" style={{ background: "var(--color-surface)" }}>
            {/* Gradient header strip based on CEFR level */}
            <div className="h-1.5" style={{ background: CEFR_GRADIENTS[selected.cefr_level] || "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }} />
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-hero" style={{ color: "var(--color-text)" }}>{selected.title}</h2>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <span className="text-caption">{selected.word_count} words</span>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium text-white"
                    style={{ background: CEFR_GRADIENTS[selected.cefr_level] || "var(--color-primary)" }}
                  >
                    {selected.cefr_level}
                  </span>
                </div>
              </div>
              <div
                className="whitespace-pre-wrap"
                style={{ color: "var(--color-text)", fontSize: `${fontSize}px`, lineHeight: 1.8, letterSpacing: "0.01em" }}
              >
                {selected.content}
              </div>

            {/* Quiz section */}
            {questions.length > 0 && !showQuiz && (
              <div className="mt-8 pt-6">
                <div className="gradient-divider mb-6" />
                <button
                  onClick={() => setShowQuiz(true)}
                  className="text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 shadow-theme-sm"
                  style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
                >
                  开始阅读理解测试 ({questions.length} 题)
                </button>
              </div>
            )}

            {showQuiz && questions.length > 0 && (
              <ReadingQuiz
                questions={questions}
                onComplete={() => setShowQuiz(false)}
              />
            )}
          </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-3xl">
        <h2 className="text-hero text-gradient mb-4">阅读训练</h2>

        {/* Level filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {CEFR_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`text-xs px-4 py-1.5 rounded-full transition-all duration-200 ${filterLevel === level ? "font-medium shadow-theme-sm" : "hover:scale-105"}`}
              style={{
                background: filterLevel === level
                  ? (level === "全部" ? "linear-gradient(135deg, var(--color-primary), var(--color-accent))" : (CEFR_GRADIENTS[level] || "var(--color-primary)"))
                  : "var(--color-surface-hover)",
                color: filterLevel === level ? "#fff" : "var(--color-text-secondary)",
              }}
            >
              {level}
              {level !== "全部" && (
                <span className="ml-1">({materials.filter((m) => m.cefr_level === level).length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Stats */}
        {readHistory.size > 0 && (
          <div className="text-caption mb-3">
            本次已阅读 {readHistory.size} 篇
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-gradient-reading p-8 text-center shadow-theme-sm flex flex-col items-center">
            <EmptyTelescope />
            <div className="text-body mt-2" style={{ color: "var(--color-text-secondary)" }}>
              {materials.length === 0 ? "暂无阅读材料，请等待数据导入" : `暂无 ${filterLevel} 级别的阅读材料`}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item, i) => {
              const isRead = readHistory.has(item.id);
              const cefrColor = CEFR_GRADIENTS[item.cefr_level] || "var(--color-primary)";
              return (
                <div
                  key={item.id}
                  onClick={() => openMaterial(item.id)}
                  className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-theme-md animate-slide-up shadow-theme-sm"
                  style={{
                    background: "var(--color-surface)",
                    animationDelay: `${i * 0.05}s`,
                  }}
                >
                  <div className="flex">
                    {/* Left color bar */}
                    <div className="w-1.5 shrink-0" style={{ background: cefrColor }} />
                    <div className="flex-1 p-4 flex justify-between items-center" style={{ opacity: isRead ? 0.7 : 1 }}>
                      <div className="flex items-center gap-3">
                        {isRead && (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #22c55e, #84cc16)" }}>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </div>
                        )}
                        <div>
                          <h3 className="font-medium" style={{ color: "var(--color-text)" }}>{item.title}</h3>
                          <p className="text-caption mt-0.5">{item.word_count} words</p>
                        </div>
                      </div>
                      <span
                        className="text-xs px-2.5 py-1 rounded-full font-medium text-white shrink-0"
                        style={{ background: cefrColor }}
                      >
                        {item.cefr_level}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
