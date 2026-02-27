"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import { tracker } from "@/lib/behavior-tracker";
import { useEnhancementConfig } from "@/hooks/use-enhancement-config";
import ImmersiveReader from "@/components/reading/immersive-reader";
import SentenceParser from "@/components/reading/sentence-parser";
import EnhancedReadingQuiz from "@/components/reading/enhanced-reading-quiz";
import ReadingProgressBar from "@/components/reading/progress-bar";
import AudioPlayer from "@/components/cognitive/AudioPlayer";
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
  questions_json?: {
    questions?: { question: string; options: string[]; answer: number; explanation?: string }[];
  } | null;
}

interface ReadingAnalysis {
  paragraphs: {
    index: number; start_char: number; end_char: number;
    topic_sentence: string;
    key_words: { text: string; type: "topic" | "transition" | "detail" }[];
    difficulty: number; purpose: string; summary_zh: string;
  }[];
  structure_type: string;
  summary: string;
  complex_sentences: {
    original: string; paragraph_index: number;
    components: { text: string; role: string; is_core: boolean }[];
    simplified_zh: string; structure_hint: string;
  }[];
  question_mapping: {
    question_index: number; relevant_paragraph: number;
    evidence_text: string; evidence_start_char: number;
    question_type: string; core_info: string;
    distractor_analysis: { option: string; trap: string }[];
  }[];
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
  const { config: enhConfig } = useEnhancementConfig();
  const [materials, setMaterials] = useState<ReadingMaterial[]>([]);
  const [selected, setSelected] = useState<ReadingMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState("全部");
  const [readHistory, setReadHistory] = useState<Set<number>>(new Set());
  const [fontSize, setFontSize] = useState(14);

  // V3.1 cognitive enhancement state
  const [analysis, setAnalysis] = useState<ReadingAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"read" | "sentences" | "quiz">("read");
  const [highlightedParagraph, setHighlightedParagraph] = useState<number | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState({ score: 0, total: 0 });

  // V4.1: behavior tracking
  const viewTrackerRef = useRef<{ end: () => void } | null>(null);
  useEffect(() => {
    if (!selected) return;
    viewTrackerRef.current?.end();
    viewTrackerRef.current = tracker.trackQuestionView(selected.id, "reading");
    return () => { viewTrackerRef.current?.end(); viewTrackerRef.current = null; };
  }, [selected?.id]);

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
      setAnalysis(null);
      setActiveTab("read");
      setHighlightedParagraph(null);
      setQuizCompleted(false);
      setReadHistory((prev) => new Set(prev).add(id));
      // async load cognitive analysis
      setAnalysisLoading(true);
      api.get<ReadingAnalysis>(`/reading/${id}/analyze`)
        .then(setAnalysis)
        .catch(() => setAnalysis(null))
        .finally(() => setAnalysisLoading(false));
    } catch { /* ignore */ }
  };

  const handleParagraphHighlight = useCallback((index: number | null) => {
    setHighlightedParagraph(index);
    if (index !== null && selected) tracker.track("paragraph_focus", { material_id: selected.id }, { event_data: { paragraph_index: index } });
  }, [selected]);

  const handleLocateParagraph = useCallback((index: number) => {
    setHighlightedParagraph(index);
    setActiveTab("read");
    setTimeout(() => {
      const el = document.getElementById(`paragraph-${index}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, []);

  const handleQuizComplete = useCallback((score: number, total: number) => {
    setQuizCompleted(true);
    setQuizScore({ score, total });
  }, []);

  const filtered = filterLevel === "全部" ? materials : materials.filter((m) => m.cefr_level === filterLevel);
  const questions = selected?.questions_json?.questions || [];

  // ── Detail view ──
  if (selected) {
    return (
      <PageTransition stagger>
        <div className="max-w-4xl">
          <ReadingProgressBar />
          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { setSelected(null); setAnalysis(null); }}
              className="text-sm hover:underline font-medium" style={{ color: "var(--color-primary)" }}>
              ← 返回列表
            </button>
            <div className="flex items-center gap-2">
              {enhConfig.auto_tts && <AudioPlayer text={selected.content || ""} compact label="全文朗读" />}
              <button onClick={() => setFontSize(Math.max(12, fontSize - 1))}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all hover:shadow-theme-sm"
                style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}>A-</button>
              <button onClick={() => setFontSize(Math.min(20, fontSize + 1))}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all hover:shadow-theme-sm"
                style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}>A+</button>
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-theme-sm" style={{ background: "var(--color-surface)" }}>
            <div className="h-1.5" style={{ background: CEFR_GRADIENTS[selected.cefr_level] || "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }} />
            <div className="p-6">
              {/* Title */}
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-hero" style={{ color: "var(--color-text)" }}>{selected.title}</h2>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <span className="text-caption">{selected.word_count} words</span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium text-white"
                    style={{ background: CEFR_GRADIENTS[selected.cefr_level] || "var(--color-primary)" }}>
                    {selected.cefr_level}
                  </span>
                </div>
              </div>

              {/* Analysis loading */}
              {analysisLoading && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ background: "var(--color-surface-hover)" }}>
                  <span className="animate-spin text-sm">⟳</span>
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>AI 正在分析文章结构...</span>
                </div>
              )}

              {/* Tabs */}
              <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: "var(--color-surface-hover)" }}>
                {([
                  { key: "read" as const, label: "沉浸阅读", count: undefined },
                  { key: "sentences" as const, label: "长难句", count: analysis?.complex_sentences?.length },
                  { key: "quiz" as const, label: "阅读理解", count: questions.length },
                 ]).map((tab) => (
                  <button key={tab.key} onClick={() => { setActiveTab(tab.key); if (selected) tracker.track("tab_switch", { material_id: selected.id }, { event_data: { tab: tab.key } }); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: activeTab === tab.key ? "var(--color-surface)" : "transparent",
                      color: activeTab === tab.key ? "var(--color-text)" : "var(--color-text-secondary)",
                      boxShadow: activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    }}>
                    {tab.label}
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full"
                        style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === "read" && (
                <ImmersiveReader content={selected.content || ""} paragraphs={analysis?.paragraphs || []}
                  structureType={analysis?.structure_type} summary={analysis?.summary}
                  fontSize={fontSize} highlightedParagraph={highlightedParagraph}
                  onParagraphClick={handleParagraphHighlight} />
              )}

              {activeTab === "sentences" && (
                analysis?.complex_sentences?.length ? (
                  <SentenceParser sentences={analysis.complex_sentences} onLocateParagraph={handleLocateParagraph} />
                ) : analysisLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>该文章暂无长难句分析</p>
                  </div>
                )
              )}

              {activeTab === "quiz" && (
                questions.length > 0 ? (
                  quizCompleted ? (
                    <div className="text-center py-8 animate-slide-up">
                      <div className="text-4xl mb-3">{quizScore.score === quizScore.total ? "🎉" : "💪"}</div>
                      <p className="text-lg font-medium" style={{ color: "var(--color-text)" }}>
                        得分：{quizScore.score}/{quizScore.total}
                      </p>
                      <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
                        {quizScore.score === quizScore.total ? "全部正确！" : "继续加油，回顾一下错题吧"}
                      </p>
                      <button onClick={() => { setQuizCompleted(false); setQuizScore({ score: 0, total: 0 }); }}
                        className="mt-4 px-5 py-2 rounded-lg text-sm text-white" style={{ background: "var(--color-primary)" }}>
                        重新做题
                      </button>
                    </div>
                  ) : (
                    <EnhancedReadingQuiz materialId={selected.id} questions={questions}
                      questionMapping={analysis?.question_mapping || []}
                      onHighlightParagraph={handleParagraphHighlight} onComplete={handleQuizComplete} />
                  )
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>该文章暂无阅读理解题目</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  // ── List view ──
  return (
    <PageTransition>
      <div className="max-w-3xl">
        <h2 className="text-hero text-gradient mb-4">阅读训练</h2>
        <div className="flex gap-2 mb-4 flex-wrap">
          {CEFR_LEVELS.map((level) => (
            <button key={level} onClick={() => setFilterLevel(level)}
              className={`text-xs px-4 py-1.5 rounded-full transition-all duration-200 ${filterLevel === level ? "font-medium shadow-theme-sm" : "hover:scale-105"}`}
              style={{
                background: filterLevel === level
                  ? (level === "全部" ? "linear-gradient(135deg, var(--color-primary), var(--color-accent))" : (CEFR_GRADIENTS[level] || "var(--color-primary)"))
                  : "var(--color-surface-hover)",
                color: filterLevel === level ? "#fff" : "var(--color-text-secondary)",
              }}>
              {level}
              {level !== "全部" && <span className="ml-1">({materials.filter((m) => m.cefr_level === level).length})</span>}
            </button>
          ))}
        </div>
        {readHistory.size > 0 && <div className="text-caption mb-3">本次已阅读 {readHistory.size} 篇</div>}
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
                <div key={item.id} onClick={() => openMaterial(item.id)}
                  className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-theme-md animate-slide-up shadow-theme-sm"
                  style={{ background: "var(--color-surface)", animationDelay: `${i * 0.05}s` }}>
                  <div className="flex">
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
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium text-white shrink-0" style={{ background: cefrColor }}>
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
