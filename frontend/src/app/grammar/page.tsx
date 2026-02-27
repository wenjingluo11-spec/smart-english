"use client";

import { useEffect, useState, useRef } from "react";
import { useGrammarStore } from "@/stores/grammar";
import { api } from "@/lib/api";
import { tracker } from "@/lib/behavior-tracker";
import GrammarVisualizer, { GrammarCompareView } from "@/components/grammar/grammar-visualizer";
import AudioPlayer from "@/components/cognitive/AudioPlayer";
import PageTransition from "@/components/ui/page-transition";
import Skeleton from "@/components/ui/skeleton";

const masteryColor = (m: number) => {
  if (m >= 80) return "#22c55e";
  if (m >= 60) return "#84cc16";
  if (m >= 40) return "#eab308";
  if (m >= 20) return "#f97316";
  return "var(--color-border)";
};

export default function GrammarPage() {
  const {
    categories, topics, topicDetail, exercises, selectedCategory, loading,
    fetchCategories, fetchTopics, fetchTopicDetail, fetchExercises, submitExercise, setCategory,
  } = useGrammarStore();

  const [view, setView] = useState<"list" | "detail" | "practice">("list");
  const [currentEx, setCurrentEx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // V3.4: grammar cognitive enhancement
  const [structureData, setStructureData] = useState<{ sentences: unknown[] } | null>(null);
  const [structureLoading, setStructureLoading] = useState(false);
  const [compareData, setCompareData] = useState<Record<string, unknown> | null>(null);

  // V4.1: behavior tracking for exercises
  const viewTrackerRef = useRef<{ end: () => void } | null>(null);
  useEffect(() => {
    if (view !== "practice" || !exercises[currentEx]) return;
    viewTrackerRef.current?.end();
    viewTrackerRef.current = tracker.trackQuestionView(exercises[currentEx].id, "grammar");
    return () => { viewTrackerRef.current?.end(); viewTrackerRef.current = null; };
  }, [view, currentEx, exercises]);

  useEffect(() => {
    fetchCategories();
    fetchTopics();
  }, [fetchCategories, fetchTopics]);

  const openTopic = async (id: number) => {
    fetchTopicDetail(id);
    setView("detail");
    setStructureData(null);
    setCompareData(null);
  };

  const startPractice = (topicId: number) => {
    fetchExercises(topicId);
    setCurrentEx(0);
    setAnswer("");
    setResult(null);
    setView("practice");
  };

  const handleSubmit = async () => {
    if (!exercises[currentEx] || !answer.trim()) return;
    setSubmitting(true);
    try {
      const res = await submitExercise(exercises[currentEx].id, answer);
      setResult(res);
      tracker.track("answer_submit", { question_id: exercises[currentEx].id, module: "grammar" }, { event_data: { answer, is_correct: res.is_correct } });
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const nextExercise = () => {
    if (currentEx < exercises.length - 1) {
      setCurrentEx(currentEx + 1);
      setAnswer("");
      setResult(null);
      setCompareData(null);
    } else {
      setView("list");
      fetchTopics(selectedCategory || undefined);
    }
  };

  return (
    <PageTransition stagger>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>
            {view === "list" ? "语法专项" : view === "detail" ? topicDetail?.name || "" : "语法练习"}
          </h2>
          {view !== "list" && (
            <button
              onClick={() => setView("list")}
              className="text-xs px-3 py-1.5 rounded-lg border"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
            >
              返回列表
            </button>
          )}
        </div>

        {/* LIST VIEW */}
        {view === "list" && (
          <>
            {/* Category tabs */}
            <div className="flex gap-1 mb-4 flex-wrap">
              <button
                onClick={() => setCategory(null)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all ${!selectedCategory ? "font-medium" : ""}`}
                style={{
                  background: !selectedCategory ? "var(--color-primary)" : "var(--color-border)",
                  color: !selectedCategory ? "#fff" : "var(--color-text-secondary)",
                }}
              >
                全部
              </button>
              {categories.map((c) => (
                <button
                  key={c.category}
                  onClick={() => setCategory(c.category)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-all ${selectedCategory === c.category ? "font-medium" : ""}`}
                  style={{
                    background: selectedCategory === c.category ? "var(--color-primary)" : "var(--color-border)",
                    color: selectedCategory === c.category ? "#fff" : "var(--color-text-secondary)",
                  }}
                >
                  {c.category} ({c.count})
                </button>
              ))}
            </div>

            {/* Topic grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
              </div>
            ) : topics.length === 0 ? (
              <div className="text-center py-16 rounded-xl border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>暂无语法知识点</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {topics.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openTopic(t.id)}
                    className="text-left rounded-xl border p-3 transition-all hover:shadow-sm"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                        {t.category}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>{t.cefr_level}</span>
                    </div>
                    <div className="text-sm font-medium mb-2" style={{ color: "var(--color-text)" }}>{t.name}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--color-border)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${t.mastery}%`, background: masteryColor(t.mastery) }} />
                      </div>
                      <span className="text-[10px] font-medium" style={{ color: masteryColor(t.mastery) }}>{t.mastery}%</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* DETAIL VIEW */}
        {view === "detail" && topicDetail && (
          <div className="space-y-4">
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                  {topicDetail.category}
                </span>
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {"★".repeat(topicDetail.difficulty)} · {topicDetail.cefr_level}
                </span>
              </div>
              <div className="text-sm whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
                {topicDetail.explanation}
              </div>
            </div>

            {topicDetail.examples.length > 0 && (
              <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium" style={{ color: "var(--color-text)" }}>例句</h4>
                  {!structureData && !structureLoading && (
                    <button
                      onClick={async () => {
                        setStructureLoading(true);
                        try {
                          const res = await api.post<{ sentences: unknown[] }>("/grammar/analyze-structures", {
                            sentences: topicDetail.examples,
                            grammar_topic: topicDetail.name,
                          });
                          setStructureData(res);
                          tracker.track("sentence_parse_view", { module: "grammar" }, { event_data: { topic: topicDetail.name } });
                        } catch { /* ignore */ }
                        setStructureLoading(false);
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg transition-all"
                      style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}
                    >
                      结构可视化
                    </button>
                  )}
                  {structureLoading && (
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--color-text-secondary)" }}>
                      <span className="animate-spin">⟳</span> 分析中...
                    </span>
                  )}
                </div>

                {/* V3.4: Structure visualization or plain examples */}
                {structureData && structureData.sentences?.length > 0 ? (
                  <GrammarVisualizer sentences={structureData.sentences as never[]} />
                ) : (
                  <div className="space-y-1.5">
                    {topicDetail.examples.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg" style={{ background: "var(--color-border)", color: "var(--color-text)" }}>
                        <span className="flex-1">{e}</span>
                        <AudioPlayer text={e} compact />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {topicDetail.tips.length > 0 && (
              <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                <h4 className="text-sm font-medium mb-2" style={{ color: "var(--color-text)" }}>易错提醒</h4>
                <ul className="space-y-1">
                  {topicDetail.tips.map((t, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                      <span>⚠️</span> {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => startPractice(topicDetail.id)}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-white"
              style={{ background: "var(--color-primary)" }}
            >
              开始练习
            </button>
          </div>
        )}

        {/* PRACTICE VIEW */}
        {view === "practice" && exercises.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {currentEx + 1} / {exercises.length}
              </span>
              <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--color-border)", color: "var(--color-text-secondary)" }}>
                {exercises[currentEx].exercise_type}
              </span>
            </div>
            <div className="h-1.5 rounded-full mb-4" style={{ background: "var(--color-border)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${((currentEx + 1) / exercises.length) * 100}%`, background: "var(--color-primary)" }} />
            </div>

            <div className="rounded-xl border p-4 mb-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
              <div className="text-sm mb-4" style={{ color: "var(--color-text)" }}>{exercises[currentEx].content}</div>

              {exercises[currentEx].options.length > 0 ? (
                <div className="space-y-2">
                  {exercises[currentEx].options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => !result && setAnswer(opt)}
                      disabled={!!result}
                      className={`w-full text-left text-sm px-4 py-2.5 rounded-lg border transition-all ${answer === opt ? "border-2 font-medium" : ""}`}
                      style={{
                        borderColor: result
                          ? opt === (result.correct_answer as string) ? "#22c55e" : answer === opt ? "#ef4444" : "var(--color-border)"
                          : answer === opt ? "var(--color-primary)" : "var(--color-border)",
                        background: result
                          ? opt === (result.correct_answer as string) ? "rgba(34,197,94,0.08)" : answer === opt ? "rgba(239,68,68,0.08)" : "transparent"
                          : answer === opt ? "var(--color-primary-light, #dbeafe)" : "transparent",
                        color: "var(--color-text)",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={!!result}
                  placeholder="输入答案..."
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
                  onKeyDown={(e) => e.key === "Enter" && !result && handleSubmit()}
                />
              )}
            </div>

            {result && (
              <div className="space-y-3 mb-4">
                <div className={`rounded-xl p-3 text-sm ${result.is_correct ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                  <div className="font-medium mb-1">{result.is_correct ? "正确！" : "错误"}</div>
                  {!result.is_correct && <div className="text-xs">正确答案：{String(result.correct_answer)}</div>}
                  {result.explanation ? <div className="text-xs mt-1">{String(result.explanation)}</div> : null}
                  {result.mastery !== undefined ? (
                    <div className="text-xs mt-1">掌握度：{Number(result.mastery)}%</div>
                  ) : null}
                </div>

                {/* V3.4: Audio comparison — hear correct vs your answer */}
                <div className="flex items-center gap-2">
                  <AudioPlayer text={exercises[currentEx].content.replace(/_{2,}/, String(result.correct_answer))} compact label="听正确发音" />
                  {!result.is_correct && (
                    <AudioPlayer text={exercises[currentEx].content.replace(/_{2,}/, answer)} compact label="听你的答案" />
                  )}
                </div>

                {/* V3.4: Grammar compare visualization for wrong answers */}
                {!result.is_correct && compareData && (
                  <GrammarCompareView data={compareData as never} />
                )}
                {!result.is_correct && !compareData && (
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.post<Record<string, unknown>>("/grammar/compare", {
                          correct_sentence: exercises[currentEx].content.replace(/_{2,}/, String(result.correct_answer)),
                          wrong_sentence: exercises[currentEx].content.replace(/_{2,}/, answer),
                          grammar_topic: topicDetail?.name || "",
                        });
                        setCompareData(res);
                        tracker.track("sentence_parse_view", { question_id: exercises[currentEx].id }, { event_data: { type: "grammar_compare" } });
                      } catch { /* ignore */ }
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}
                  >
                    查看语法对比分析
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-end">
              {!result ? (
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !answer.trim()}
                  className="text-sm px-6 py-2 rounded-lg text-white disabled:opacity-30"
                  style={{ background: "var(--color-primary)" }}
                >
                  {submitting ? "判题中..." : "提交"}
                </button>
              ) : (
                <button
                  onClick={nextExercise}
                  className="text-sm px-6 py-2 rounded-lg text-white"
                  style={{ background: "var(--color-primary)" }}
                >
                  {currentEx < exercises.length - 1 ? "下一题" : "完成"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
