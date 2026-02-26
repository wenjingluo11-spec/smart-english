"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { CorrectFeedback, WrongFeedback } from "@/components/ui/answer-feedback";
import XPToast from "@/components/ui/xp-toast";
import PageTransition from "@/components/ui/page-transition";
import Skeleton from "@/components/ui/skeleton";
import Confetti from "@/components/ui/confetti";
import { EmptyTelescope, EmptyCheckStar } from "@/components/ui/empty-illustrations";

interface Question {
  id: number;
  topic: string;
  difficulty: number;
  question_type: string;
  content: string;
  options_json: Record<string, string> | null;
}

interface SubmitResult {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  xp?: { xp_gained: number; total_xp: number; level: number };
}

interface FilterOption {
  value: string | number;
  count: number;
}

interface Filters {
  question_types: FilterOption[];
  difficulties: FilterOption[];
  grades: FilterOption[];
  topics: FilterOption[];
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "基础",
  3: "中等",
  4: "较难",
  5: "拔高",
};

function DifficultyDots({ level }: { level: number }) {
  const colors = ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"];
  return (
    <span className="inline-flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="inline-block w-2 h-2 rounded-full"
          style={{
            background: i <= level ? colors[i - 1] : "transparent",
            border: `1.5px solid ${i <= level ? colors[i - 1] : "var(--color-border)"}`,
          }}
        />
      ))}
    </span>
  );
}

/** 从 content 文本中解析 A/B/C/D 选项，返回 { stem, options } */
function parseChoiceOptions(content: string): { stem: string; options: { key: string; text: string }[] } | null {
  // 匹配 A. / A．/ A、/ A) 等格式的选项行
  const optionRe = /^([A-Da-d])\s*[.．、)]\s*(.+)$/;
  const lines = content.split("\n");
  const options: { key: string; text: string }[] = [];
  const stemLines: string[] = [];
  let foundOptions = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const m = trimmed.match(optionRe);
    if (m) {
      foundOptions = true;
      options.push({ key: m[1].toUpperCase(), text: m[2].trim() });
    } else if (!foundOptions) {
      stemLines.push(line);
    } else {
      // 选项之后的非选项行，追加到最后一个选项
      if (options.length > 0) {
        options[options.length - 1].text += " " + trimmed;
      }
    }
  }
  if (options.length < 2) return null;
  return { stem: stemLines.join("\n").trim(), options };
}

/** 将 content 按 ___ 拆分成文本段和空位，返回 segments 数组 */
function parseBlankSegments(content: string): string[] | null {
  const parts = content.split(/(_{2,})/);
  const blankCount = parts.filter((p) => /^_{2,}$/.test(p)).length;
  if (blankCount === 0) return null;
  return parts;
}

/** 判断题型是否属于选择类 */
const CHOICE_TYPES = ["单项选择", "完形填空", "阅读理解", "词汇运用", "情景对话", "判断题"];
/** 判断题型是否属于填空类 */
const BLANK_TYPES = ["填空题", "语法填空"];

export default function PracticePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [xpTrigger, setXpTrigger] = useState(0);
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [blankAnswers, setBlankAnswers] = useState<string[]>([]);

  // filters
  const [filters, setFilters] = useState<Filters | null>(null);
  const [questionType, setQuestionType] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [grade, setGrade] = useState("");
  const [topic, setTopic] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (questionType) params.set("question_type", questionType);
    if (difficulty) params.set("difficulty", difficulty);
    if (grade) params.set("grade", grade);
    if (topic) params.set("topic", topic);
    const qs = params.toString();
    api.get<Filters>(`/practice/filters${qs ? `?${qs}` : ""}`).then(setFilters).catch(() => {});
  }, [questionType, difficulty, grade, topic]);

  const fetchQuestions = async () => {
    setLoading(true);
    setResult(null);
    setCurrent(0);
    setAnswer("");
    setShowExplanation(false);
    setBlankAnswers([]);
    try {
      const params = new URLSearchParams();
      if (questionType) params.set("question_type", questionType);
      if (difficulty) params.set("difficulty", difficulty);
      if (grade) params.set("grade", grade);
      if (topic) params.set("topic", topic);
      params.set("limit", "10");
      const data = await api.get<Question[]>(`/practice/questions?${params.toString()}`);
      setQuestions(data);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    const q = questions[current];
    setSubmitting(true);
    try {
      const res = await api.post<SubmitResult>("/practice/submit", {
        question_id: q.id,
        answer: answer.trim(),
        time_spent: 0,
      });
      setResult(res);
      setShowExplanation(false);
      if (res.is_correct) {
        setConfettiTrigger(false);
        setTimeout(() => setConfettiTrigger(true), 50);
      }
      if (res.xp?.xp_gained) {
        setXpGained(res.xp.xp_gained);
        setXpTrigger((t) => t + 1);
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    setResult(null);
    setAnswer("");
    setShowExplanation(false);
    setConfettiTrigger(false);
    setBlankAnswers([]);
    setCurrent((prev) => prev + 1);
  };

  const q = questions[current];
  const selectCls = "border rounded-full px-4 py-2 text-sm min-w-0 transition-all duration-200 hover:shadow-theme-sm";
  const selectStyle = { borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)" };

  return (
    <PageTransition stagger>
      <div className="max-w-3xl">
        <XPToast xpGained={xpGained} trigger={xpTrigger} />
        <Confetti trigger={confettiTrigger} />
        <h2 className="text-hero text-gradient mb-4">智能题库</h2>

        {/* Progress bar */}
        {questions.length > 0 && !loading && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-caption mb-1.5">
              <span>第 {current + 1} / {questions.length} 题</span>
              <span>{Math.round(((current + (result ? 1 : 0)) / questions.length) * 100)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
              <div className="h-full rounded-full progress-gradient transition-all duration-500" style={{ width: `${((current + (result ? 1 : 0)) / questions.length) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Filter Section */}
        <div className="card-gradient-practice p-6 mb-6 shadow-theme-sm">
          <div className="flex flex-wrap gap-3">
            <select className={selectCls} style={selectStyle} value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
              <option value="">全部题型</option>
              {filters?.question_types.map((o) => (
                <option key={String(o.value)} value={String(o.value)}>
                  {String(o.value)}（{o.count}）
                </option>
              ))}
            </select>

            <select className={selectCls} style={selectStyle} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="">全部难度</option>
              {filters?.difficulties.map((o) => (
                <option key={String(o.value)} value={String(o.value)}>
                  {DIFFICULTY_LABELS[Number(o.value)] ?? `难度${o.value}`}（{o.count}）
                </option>
              ))}
            </select>

            <select className={selectCls} style={selectStyle} value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">全部年级</option>
              {filters?.grades.map((o) => (
                <option key={String(o.value)} value={String(o.value)}>
                  {String(o.value)}（{o.count}）
                </option>
              ))}
            </select>

            <select className={selectCls} style={selectStyle} value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">全部知识点</option>
              {filters?.topics.map((o) => (
                <option key={String(o.value)} value={String(o.value)}>
                  {String(o.value)}（{o.count}）
                </option>
              ))}
            </select>

            <button
              onClick={fetchQuestions}
              className="text-white px-6 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-theme-sm"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
            >
              开始练习
            </button>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-2 w-full rounded-full mb-5" />
            <Skeleton className="h-5 w-full mb-2" />
            <Skeleton className="h-5 w-4/5 mb-2" />
            <Skeleton className="h-5 w-3/5 mb-6" />
            <Skeleton className="h-24 w-full rounded-lg mb-4" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        )}

        {/* Empty state */}
        {!loading && !q && (
          <div className="card-gradient-practice p-12 text-center shadow-theme-sm">
            {questions.length === 0 && current === 0 ? (
              <div className="animate-slide-up flex flex-col items-center">
                <EmptyTelescope />
                <div className="text-base font-medium mb-1 mt-2" style={{ color: "var(--color-text)" }}>
                  选择筛选条件，开始今天的练习吧
                </div>
                <div className="text-caption">
                  从上方选择题型、难度等条件，点击"开始练习"
                </div>
              </div>
            ) : (
              <div className="animate-slide-up flex flex-col items-center">
                <EmptyCheckStar />
                <div className="text-base font-medium mt-2 text-gradient">
                  已完成全部题目！
                </div>
              </div>
            )}
          </div>
        )}

        {/* Question card */}
        {!loading && q && (
          <div
            className="rounded-2xl overflow-hidden animate-slide-up shadow-theme-sm"
            style={{ background: "var(--color-surface)" }}
          >
            {/* Gradient header strip */}
            <div className="h-1.5 progress-gradient" />
            <div className="p-6">
            {/* Meta info row */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: "linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.12), rgba(var(--color-accent-rgb), 0.08))", color: "var(--color-primary-dark)" }}
              >
                {q.question_type}
              </span>
              <DifficultyDots level={q.difficulty} />
              {q.topic && (
                <span
                  className="px-2.5 py-1 rounded-full text-xs"
                  style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}
                >
                  {q.topic}
                </span>
              )}
            </div>

            {/* Question content + Answer input */}
            {(() => {
              const choiceParsed = (CHOICE_TYPES.includes(q.question_type) || q.options_json) ? (q.options_json ? { stem: q.content, options: Object.entries(q.options_json).map(([k, v]) => ({ key: k, text: v })) } : parseChoiceOptions(q.content)) : null;
              const blankSegments = BLANK_TYPES.includes(q.question_type) ? parseBlankSegments(q.content) : null;
              const blankCount = blankSegments ? blankSegments.filter((p) => /^_{2,}$/.test(p)).length : 0;

              return (
                <>
                  {/* --- Choice type: stem + option buttons --- */}
                  {choiceParsed ? (
                    <>
                      <div
                        className="text-base leading-relaxed mb-5 whitespace-pre-wrap p-4 rounded-lg"
                        style={{ color: "var(--color-text)", background: "var(--color-surface-hover)" }}
                      >
                        {choiceParsed.stem}
                      </div>
                      {!result && (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            {choiceParsed.options.map((o) => (
                              <button
                                key={o.key}
                                onClick={() => setAnswer(o.key)}
                                disabled={submitting}
                                className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 cursor-pointer flex items-center gap-3"
                                style={{
                                  borderLeft: `3px solid ${answer === o.key ? "var(--color-primary)" : "transparent"}`,
                                  background: answer === o.key ? "linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.08), rgba(var(--color-accent-rgb), 0.04))" : "var(--color-surface-hover)",
                                  color: "var(--color-text)",
                                  boxShadow: answer === o.key ? "0 2px 8px rgba(var(--color-primary-rgb), 0.1)" : "none",
                                }}
                              >
                                <span className="font-medium" style={{ color: answer === o.key ? "var(--color-primary)" : "var(--color-text-secondary)" }}>{o.key}.</span>
                                <span>{o.text}</span>
                              </button>
                            ))}
                          </div>
                          {submitting ? <div className="py-4"><Skeleton className="h-4 w-1/3" /></div> : (
                            <button onClick={handleSubmit} disabled={!answer.trim()} className="text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer shadow-theme-sm" style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}>提交答案</button>
                          )}
                        </div>
                      )}
                    </>
                  ) : blankSegments ? (
                    /* --- Fill-in-the-blank: inline inputs in content --- */
                    <>
                      <div
                        className="text-base leading-relaxed mb-5 p-4 rounded-lg"
                        style={{ color: "var(--color-text)", background: "var(--color-surface-hover)" }}
                      >
                        {(() => {
                          let blankIdx = 0;
                          return blankSegments.map((seg, i) => {
                            if (/^_{2,}$/.test(seg)) {
                              const idx = blankIdx++;
                              return (
                                <input
                                  key={i}
                                  className="border-b-2 border-t-0 border-l-0 border-r-0 px-1 py-0.5 text-sm focus:outline-none transition-colors bg-transparent mx-1 text-center"
                                  style={{
                                    borderBottomColor: (blankAnswers[idx] || "") ? "var(--color-primary)" : "var(--color-border)",
                                    color: "var(--color-text)",
                                    width: Math.max(80, seg.length * 10),
                                  }}
                                  placeholder={blankCount > 1 ? `(${idx + 1})` : "填写答案"}
                                  value={blankAnswers[idx] || ""}
                                  onChange={(e) => {
                                    const next = [...blankAnswers];
                                    while (next.length <= idx) next.push("");
                                    next[idx] = e.target.value;
                                    setBlankAnswers(next);
                                    setAnswer(next.filter(Boolean).join("; "));
                                  }}
                                  disabled={!!result || submitting}
                                  autoFocus={idx === 0}
                                />
                              );
                            }
                            return <span key={i} className="whitespace-pre-wrap">{seg}</span>;
                          });
                        })()}
                      </div>
                      {!result && (
                        <div className="space-y-3">
                          {submitting ? <div className="py-4"><Skeleton className="h-4 w-1/3" /></div> : (
                            <button onClick={handleSubmit} disabled={!answer.trim()} className="text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer shadow-theme-sm" style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}>提交答案</button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    /* --- Fallback: textarea for other types --- */
                    <>
                      <div
                        className="text-base leading-relaxed mb-5 whitespace-pre-wrap p-4 rounded-lg"
                        style={{ color: "var(--color-text)", background: "var(--color-surface-hover)" }}
                      >
                        {q.content}
                      </div>
                      {!result && (
                        <div className="space-y-3">
                          <div className="relative">
                            <textarea
                              className="w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 resize-none transition-all duration-200"
                              style={{
                                borderColor: "var(--color-border)",
                                background: "var(--color-surface)",
                                color: "var(--color-text)",
                                // @ts-expect-error CSS custom property for ring color
                                "--tw-ring-color": "var(--color-primary)",
                              }}
                              placeholder="输入你的答案..."
                              rows={3}
                              value={answer}
                              onChange={(e) => setAnswer(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey && !submitting) {
                                  e.preventDefault();
                                  handleSubmit();
                                }
                              }}
                              disabled={submitting}
                            />
                            <span className="absolute bottom-2 right-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                              {answer.length} 字
                            </span>
                          </div>
                          {submitting ? <div className="py-4"><Skeleton className="h-4 w-1/3" /></div> : (
                            <button onClick={handleSubmit} disabled={!answer.trim()} className="text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer shadow-theme-sm" style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}>提交答案</button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              );
            })()}

            {/* Result feedback */}
            {result && (
              <div className="space-y-3">
                {result.is_correct ? (
                  <div
                    className="p-4 rounded-lg border-l-4 animate-slide-up"
                    style={{ background: "#f0fdf4", borderLeftColor: "#22c55e" }}
                  >
                    <CorrectFeedback />
                  </div>
                ) : (
                  <div
                    className="p-4 rounded-lg border-l-4 animate-slide-up"
                    style={{ background: "#fef2f2", borderLeftColor: "#ef4444" }}
                  >
                    <WrongFeedback />
                    {result.correct_answer && (
                      <div className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                        正确答案：<span className="font-medium" style={{ color: "var(--color-text)" }}>{result.correct_answer}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Explanation toggle */}
                {result.explanation && (
                  <div>
                    <button
                      onClick={() => setShowExplanation(!showExplanation)}
                      className="text-sm flex items-center gap-1 cursor-pointer transition-colors"
                      style={{ color: "var(--color-primary)" }}
                    >
                      <span style={{ display: "inline-block", transition: "transform 0.2s", transform: showExplanation ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
                      {showExplanation ? "收起解析" : "查看解析"}
                    </button>
                    {showExplanation && (
                      <div
                        className="text-sm p-4 rounded-xl whitespace-pre-wrap mt-2 animate-slide-up"
                        style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)", borderLeft: "3px solid var(--color-accent)" }}
                      >
                        {result.explanation}
                      </div>
                    )}
                  </div>
                )}

                {/* Next button */}
                {current < questions.length - 1 && (
                  <button
                    onClick={handleNext}
                    className="text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-1 shadow-theme-sm"
                    style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
                  >
                    下一题 →
                  </button>
                )}
              </div>
            )}
          </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
