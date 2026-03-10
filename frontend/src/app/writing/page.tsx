"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import ScoreChart from "@/components/writing/score-chart";
import HistoryTimeline from "@/components/writing/history-timeline";
import XPToast from "@/components/ui/xp-toast";
import PageTransition from "@/components/ui/page-transition";
import Skeleton from "@/components/ui/skeleton";

interface WritingFeedback {
  id: number;
  score: number | null;
  feedback_json: {
    summary?: string;
    strengths?: string[];
    improvements?: string[];
    corrected_sentences?: { original: string; corrected: string; reason: string }[];
    logic_questions?: string[];
    framework_only_tips?: string[];
    cognitive_audit?: {
      student_points?: string[];
      draft_content?: string;
      revised_content?: string;
      revision_reflection?: string;
      revision_applied?: boolean;
      reflection_quality?: number;
      ghostwriting_risk?: { score: number; level: string; mode: string };
    };
  } | null;
  created_at: string;
  xp?: { xp_gained: number };
}

interface HistoryItem {
  id: number;
  prompt: string;
  score: number | null;
  feedback_json: WritingFeedback["feedback_json"];
  created_at: string;
}

interface Outline {
  title_suggestion: string;
  structure: { section: string; key_points: string[]; suggested_sentences: string[] }[];
  vocabulary_hints: string[];
  grammar_focus: string[];
  clarify_questions?: string[];
  student_points?: string[];
  word_count_suggestion: number;
}

interface RevisionGuide {
  overall_comment: string;
  paragraph_feedback: { paragraph_index: number; original: string; issues: string[]; suggestions: string[]; improved_version: string }[];
  language_tips: string[];
  next_steps: string[];
  logic_challenge_questions?: string[];
}

type WritingStep = "topic" | "outline" | "draft" | "revision" | "submit" | "result";

export default function WritingPage() {
  const [tab, setTab] = useState<"guided" | "free" | "history">("guided");
  const [step, setStep] = useState<WritingStep>("topic");
  const [prompt, setPrompt] = useState("");
  const [content, setContent] = useState("");
  const [studentPoints, setStudentPoints] = useState<string[]>(["", "", ""]);
  const [draftContent, setDraftContent] = useState("");
  const [revisedContent, setRevisedContent] = useState("");
  const [revisionReflection, setRevisionReflection] = useState("");
  const [outline, setOutline] = useState<Outline | null>(null);
  const [revisionGuide, setRevisionGuide] = useState<RevisionGuide | null>(null);
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [xpTrigger, setXpTrigger] = useState(0);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await api.get<HistoryItem[]>("/writing/history");
      setHistory(data);
    } catch { setHistory([]); }
    finally { setHistoryLoading(false); }
  };

  useEffect(() => {
    if (tab === "history") fetchHistory();
  }, [tab]);

  const handleGenerateOutline = async () => {
    const cleanedPoints = studentPoints.map((p) => p.trim()).filter(Boolean);
    if (!prompt.trim() || cleanedPoints.length < 3) {
      setError("请先填写题目和至少 3 个观点");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post<Outline>("/writing/generate-outline", {
        prompt,
        content: "",
        student_points: cleanedPoints,
      });
      setOutline(res);
      setStep("outline");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "生成提纲失败");
    }
    setLoading(false);
  };

  const handleGetRevision = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.post<RevisionGuide>("/writing/revision-guide", { prompt, content });
      setRevisionGuide(res);
      setDraftContent(content);
      if (!revisedContent.trim()) {
        setRevisedContent(content);
      }
      setStep("revision");
    } catch { setError("获取修改建议失败"); }
    setLoading(false);
  };

  const handleSubmit = async () => {
    const finalContent = revisedContent.trim() || content.trim();
    if (!finalContent) return;
    setLoading(true);
    setError("");
    setFeedback(null);
    try {
      const payload = tab === "guided"
        ? {
          prompt: prompt || "Free writing",
          content: finalContent,
          student_points: studentPoints.map((p) => p.trim()).filter(Boolean),
          draft_content: draftContent || content || finalContent,
          revised_content: revisedContent.trim() ? revisedContent : null,
          revision_reflection: revisionReflection.trim() ? revisionReflection : null,
        }
        : {
          prompt: prompt || "Free writing",
          content: finalContent,
        };
      const res = await api.post<WritingFeedback>("/writing/submit", {
        ...payload,
      });
      setFeedback(res);
      setStep("result");
      if (res.xp?.xp_gained) {
        setXpGained(res.xp.xp_gained);
        setXpTrigger((t) => t + 1);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "提交失败");
    }
    setLoading(false);
  };

  const resetGuided = () => {
    setStep("topic");
    setPrompt("");
    setContent("");
    setStudentPoints(["", "", ""]);
    setDraftContent("");
    setRevisedContent("");
    setRevisionReflection("");
    setOutline(null);
    setRevisionGuide(null);
    setFeedback(null);
    setError("");
  };

  const scoreData = history
    .filter((h) => h.score !== null)
    .slice(0, 10)
    .reverse()
    .map((h) => ({ date: h.created_at.slice(0, 10), score: h.score! }));

  const stepLabels = ["选题", "提纲", "写作", "修改", "提交", "结果"];
  const stepKeys: WritingStep[] = ["topic", "outline", "draft", "revision", "submit", "result"];
  const stepIndex = stepKeys.indexOf(step);

  return (
    <PageTransition stagger>
      <div className="max-w-3xl">
        <XPToast xpGained={xpGained} trigger={xpTrigger} />

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-full" style={{ background: "var(--color-surface-hover)" }}>
          {(["guided", "free", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === "guided") resetGuided(); }}
              className={`flex-1 text-sm py-2 rounded-full transition-all duration-200 ${tab === t ? "font-medium shadow-theme-sm" : ""}`}
              style={{
                background: tab === t ? "linear-gradient(135deg, var(--color-primary), var(--color-accent))" : "transparent",
                color: tab === t ? "white" : "var(--color-text-secondary)",
              }}
            >
              {t === "guided" ? "引导写作" : t === "free" ? "自由写作" : "历史记录"}
            </button>
          ))}
        </div>

        {/* GUIDED WRITING */}
        {tab === "guided" && (
          <div>
            {/* Step indicator */}
            <div className="flex items-center gap-1 mb-4">
              {stepLabels.slice(0, 5).map((s, i) => (
                <div key={s} className="flex items-center gap-1 flex-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-all duration-300 ${i === stepIndex ? "animate-pulse-soft" : ""}`}
                    style={{
                      background: i < stepIndex ? "linear-gradient(135deg, #22c55e, #84cc16)" : i === stepIndex ? "linear-gradient(135deg, var(--color-primary), var(--color-accent))" : "var(--color-surface-hover)",
                      color: i <= stepIndex ? "#fff" : "var(--color-text-secondary)",
                      boxShadow: i === stepIndex ? "0 2px 8px rgba(var(--color-primary-rgb), 0.3)" : "none",
                    }}
                  >
                    {i < stepIndex ? "✓" : i + 1}
                  </div>
                  <span className="text-[10px] hidden sm:inline font-medium" style={{ color: i <= stepIndex ? "var(--color-primary)" : "var(--color-text-secondary)" }}>
                    {s}
                  </span>
                  {i < 4 && <div className="flex-1 h-0.5 rounded-full" style={{ background: i < stepIndex ? "linear-gradient(90deg, #22c55e, #84cc16)" : i === stepIndex ? "linear-gradient(90deg, var(--color-primary), var(--color-accent))" : "var(--color-surface-hover)" }} />}
                </div>
              ))}
            </div>

            {error && <div className="text-xs text-red-500 mb-3">{error}</div>}

            {/* Step: Topic */}
            {step === "topic" && (
              <div className="card-gradient-writing p-5 shadow-theme-sm">
                <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>Step 1: 确定写作主题</h3>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="输入写作题目或要求，例如：Write about your favorite holiday..."
                  className="w-full border rounded-xl p-3 text-sm resize-none focus:outline-none transition-all duration-200"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)" }}
                  rows={3}
                />
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                    先写下你的 3 个观点（必填）
                  </p>
                  {studentPoints.map((point, idx) => (
                    <input
                      key={idx}
                      value={point}
                      onChange={(e) => {
                        const next = [...studentPoints];
                        next[idx] = e.target.value;
                        setStudentPoints(next);
                      }}
                      placeholder={`观点 ${idx + 1}`}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none transition-all duration-200"
                      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)" }}
                    />
                  ))}
                </div>
                <button
                  onClick={handleGenerateOutline}
                  disabled={loading || !prompt.trim() || studentPoints.map((p) => p.trim()).filter(Boolean).length < 3}
                  className="mt-3 px-5 py-2 rounded-full text-sm font-medium text-white disabled:opacity-30 transition-all duration-200 hover:scale-105 active:scale-95 shadow-theme-sm"
                  style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
                >
                  {loading ? "生成提纲中..." : "生成写作提纲"}
                </button>
              </div>
            )}

            {/* Step: Outline */}
            {step === "outline" && outline && (
              <div className="space-y-3">
                <div className="card-gradient-writing p-5 shadow-theme-sm">
                  <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>Step 2: 写作提纲</h3>
                  {outline.student_points && outline.student_points.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>你的观点</p>
                      <div className="flex flex-wrap gap-1">
                        {outline.student_points.map((p, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {outline.title_suggestion && (
                    <div className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
                      建议标题：<span className="font-medium" style={{ color: "var(--color-text)" }}>{outline.title_suggestion}</span>
                      {outline.word_count_suggestion > 0 && <span> · 建议字数：{outline.word_count_suggestion} 词</span>}
                    </div>
                  )}
                  <div className="space-y-3">
                    {outline.structure.map((s, i) => (
                      <div key={i} className="rounded-lg p-3" style={{ background: "var(--color-bg)" }}>
                        <div className="text-xs font-medium mb-1" style={{ color: "var(--color-primary)" }}>
                          {i + 1}. {s.section}
                        </div>
                        <ul className="space-y-0.5">
                          {s.key_points.map((p, j) => (
                            <li key={j} className="text-xs" style={{ color: "var(--color-text)" }}>• {p}</li>
                          ))}
                        </ul>
                        {s.suggested_sentences.length > 0 && (
                          <div className="mt-1.5 text-[10px] italic" style={{ color: "var(--color-text-secondary)" }}>
                            参考：{s.suggested_sentences.join(" / ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {(outline.vocabulary_hints.length > 0 || outline.grammar_focus.length > 0) && (
                  <div className="flex gap-3">
                    {outline.vocabulary_hints.length > 0 && (
                      <div className="flex-1 rounded-xl border p-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                        <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text)" }}>推荐词汇</div>
                        <div className="flex flex-wrap gap-1">
                          {outline.vocabulary_hints.map((v, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--color-border)", color: "var(--color-text)" }}>{v}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {outline.grammar_focus.length > 0 && (
                      <div className="flex-1 rounded-xl border p-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                        <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text)" }}>语法要点</div>
                        <ul className="space-y-0.5">
                          {outline.grammar_focus.map((g, i) => (
                            <li key={i} className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>• {g}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {outline.clarify_questions && outline.clarify_questions.length > 0 && (
                  <div className="rounded-xl border p-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                    <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text)" }}>先回答这些追问再开写</div>
                    {outline.clarify_questions.map((q, i) => (
                      <div key={i} className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>• {q}</div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setDraftContent("");
                    setRevisedContent("");
                    setRevisionReflection("");
                    setStep("draft");
                  }}
                  className="w-full py-2.5 rounded-full text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-theme-sm"
                  style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
                >
                  开始写作
                </button>
              </div>
            )}

            {/* Step: Draft */}
            {step === "draft" && (
              <div className="card-gradient-writing p-5 shadow-theme-sm">
                <h3 className="text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>Step 3: 撰写草稿</h3>
                <div className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
                  题目：{prompt} · 字数：{content.split(/\s+/).filter(Boolean).length} 词
                </div>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start writing your essay here..."
                  className="w-full border rounded-xl p-3 text-sm resize-none focus:outline-none transition-all duration-200"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)", minHeight: 200 }}
                  rows={10}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleGetRevision}
                    disabled={loading || !content.trim()}
                    className="flex-1 py-2.5 rounded-full text-sm font-medium disabled:opacity-30 transition-all duration-200 hover:scale-[1.02]"
                    style={{ background: "rgba(var(--color-primary-rgb), 0.1)", color: "var(--color-primary)", border: "1px solid rgba(var(--color-primary-rgb), 0.2)" }}
                  >
                    {loading ? "分析中..." : "获取修改建议"}
                  </button>
                  <button
                    onClick={() => {
                      setDraftContent(content);
                      setRevisedContent(content);
                      setStep("submit");
                    }}
                    disabled={!content.trim()}
                    className="flex-1 py-2.5 rounded-full text-sm font-medium text-white disabled:opacity-30 transition-all duration-200 hover:scale-[1.02] shadow-theme-sm"
                    style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
                  >
                    跳过修改，直接提交
                  </button>
                </div>
              </div>
            )}

            {/* Step: Revision */}
            {step === "revision" && revisionGuide && (
              <div className="space-y-3">
                <div className="card-gradient-writing p-5 shadow-theme-sm">
                  <h3 className="text-sm font-medium mb-2" style={{ color: "var(--color-text)" }}>Step 4: 修改建议</h3>
                  {revisionGuide.overall_comment && (
                    <div className="text-xs p-3 rounded-xl mb-3" style={{ background: "var(--color-surface)", color: "var(--color-text)", borderLeft: "3px solid var(--color-accent)" }}>
                      {revisionGuide.overall_comment}
                    </div>
                  )}
                  <div className="space-y-3">
                    {revisionGuide.paragraph_feedback.map((p, i) => (
                      <div key={i} className="rounded-lg p-3" style={{ background: "var(--color-bg)" }}>
                        <div className="text-xs font-medium mb-1" style={{ color: "var(--color-primary)" }}>段落 {p.paragraph_index + 1}</div>
                        {p.issues.length > 0 && (
                          <div className="mb-1">
                            {p.issues.map((issue, j) => (
                              <div key={j} className="text-xs text-red-600">• {issue}</div>
                            ))}
                          </div>
                        )}
                        {p.suggestions.length > 0 && (
                          <div className="mb-1">
                            {p.suggestions.map((s, j) => (
                              <div key={j} className="text-xs text-green-600">→ {s}</div>
                            ))}
                          </div>
                        )}
                        {p.improved_version && (
                          <div className="text-xs italic mt-1 p-2 rounded" style={{ background: "rgba(34,197,94,0.08)", color: "var(--color-text)" }}>
                            参考改进：{p.improved_version}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {(revisionGuide.language_tips.length > 0 || revisionGuide.next_steps.length > 0) && (
                  <div className="rounded-xl border p-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                    {revisionGuide.language_tips.length > 0 && (
                      <div className="mb-2">
                        <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text)" }}>语言提升</div>
                        {revisionGuide.language_tips.map((t, i) => (
                          <div key={i} className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>• {t}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {revisionGuide.logic_challenge_questions && revisionGuide.logic_challenge_questions.length > 0 && (
                  <div className="rounded-xl border p-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                    <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text)" }}>逻辑追问</div>
                    {revisionGuide.logic_challenge_questions.map((q, i) => (
                      <div key={i} className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>• {q}</div>
                    ))}
                  </div>
                )}

                <div className="rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                  <div className="text-xs font-medium" style={{ color: "var(--color-text)" }}>二次改写稿</div>
                  <textarea
                    value={revisedContent}
                    onChange={(e) => setRevisedContent(e.target.value)}
                    placeholder="根据建议写出你的修改稿..."
                    className="w-full border rounded-xl p-3 text-sm resize-none focus:outline-none transition-all duration-200"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)", minHeight: 160 }}
                    rows={8}
                  />
                  <div className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
                    修改稿字数：{revisedContent.split(/\s+/).filter(Boolean).length}
                  </div>
                  <div className="text-xs font-medium mt-1" style={{ color: "var(--color-text)" }}>反思说明（必填）</div>
                  <textarea
                    value={revisionReflection}
                    onChange={(e) => setRevisionReflection(e.target.value)}
                    placeholder="说明你改了哪些地方，为什么这样改。"
                    className="w-full border rounded-xl p-3 text-sm resize-none focus:outline-none transition-all duration-200"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)" }}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setStep("draft")}
                    className="flex-1 py-2.5 rounded-full text-sm font-medium transition-all duration-200 hover:scale-[1.02]"
                    style={{ background: "rgba(var(--color-primary-rgb), 0.1)", color: "var(--color-primary)", border: "1px solid rgba(var(--color-primary-rgb), 0.2)" }}
                  >
                    返回修改
                  </button>
                  <button
                    onClick={() => setStep("submit")}
                    disabled={!revisedContent.trim() || !revisionReflection.trim()}
                    className="flex-1 py-2.5 rounded-full text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] shadow-theme-sm"
                    style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))", opacity: !revisedContent.trim() || !revisionReflection.trim() ? 0.5 : 1 }}
                  >
                    提交终稿
                  </button>
                </div>
              </div>
            )}

            {/* Step: Submit */}
            {step === "submit" && (
              <div className="card-gradient-writing p-5 shadow-theme-sm">
                <h3 className="text-sm font-medium mb-2" style={{ color: "var(--color-text)" }}>Step 5: 确认提交</h3>
                <div className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
                  题目：{prompt} · 字数：{(revisedContent.trim() || content).split(/\s+/).filter(Boolean).length} 词
                </div>
                <div className="text-xs p-3 rounded-xl mb-3 whitespace-pre-wrap max-h-40 overflow-y-auto" style={{ background: "var(--color-surface)", color: "var(--color-text)" }}>
                  {revisedContent.trim() || content}
                </div>
                {revisionReflection.trim() && (
                  <div className="text-xs p-3 rounded-xl mb-3" style={{ background: "var(--color-bg)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
                    反思：{revisionReflection}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep("draft")}
                    className="flex-1 py-2.5 rounded-full text-sm transition-all duration-200 hover:scale-[1.02]"
                    style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}
                  >
                    继续修改
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-full text-sm font-medium text-white disabled:opacity-50 transition-all duration-200 hover:scale-[1.02] shadow-theme-sm"
                    style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
                  >
                    {loading ? "批改中..." : "提交批改"}
                  </button>
                </div>
              </div>
            )}

            {/* Step: Result */}
            {step === "result" && feedback && (
              <div className="space-y-3">
                <div className="rounded-2xl p-6 text-center shadow-theme-md" style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}>
                  <div className="text-4xl font-bold mb-1" style={{ color: "white" }}>{feedback.score ?? "--"}</div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.8)" }}>写作得分</div>
                </div>
                {feedback.feedback_json?.summary && (
                  <div className="card-gradient-writing p-4 shadow-theme-sm">
                    <div className="text-sm" style={{ color: "var(--color-text)" }}>{feedback.feedback_json.summary}</div>
                  </div>
                )}
                {feedback.feedback_json?.strengths && feedback.feedback_json.strengths.length > 0 && (
                  <div className="rounded-2xl p-4 shadow-theme-sm" style={{ background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(132,204,22,0.05))", border: "1px solid rgba(34,197,94,0.15)" }}>
                    <div className="text-xs font-medium mb-1 text-green-600">优点</div>
                    {feedback.feedback_json.strengths.map((s, i) => (
                      <div key={i} className="text-xs" style={{ color: "var(--color-text)" }}>• {s}</div>
                    ))}
                  </div>
                )}
                {feedback.feedback_json?.improvements && feedback.feedback_json.improvements.length > 0 && (
                  <div className="rounded-2xl p-4 shadow-theme-sm" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.08), rgba(234,179,8,0.05))", border: "1px solid rgba(249,115,22,0.15)" }}>
                    <div className="text-xs font-medium mb-1 text-orange-600">改进建议</div>
                    {feedback.feedback_json.improvements.map((s, i) => (
                      <div key={i} className="text-xs" style={{ color: "var(--color-text)" }}>• {s}</div>
                    ))}
                  </div>
                )}
                {feedback.feedback_json?.logic_questions && feedback.feedback_json.logic_questions.length > 0 && (
                  <div className="rounded-2xl p-4 shadow-theme-sm" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                    <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text)" }}>逻辑追问</div>
                    {feedback.feedback_json.logic_questions.map((q, i) => (
                      <div key={i} className="text-xs" style={{ color: "var(--color-text-secondary)" }}>• {q}</div>
                    ))}
                  </div>
                )}
                {feedback.feedback_json?.framework_only_tips && feedback.feedback_json.framework_only_tips.length > 0 && (
                  <div className="rounded-2xl p-4 shadow-theme-sm" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
                    <div className="text-xs font-medium mb-1" style={{ color: "#9a3412" }}>框架建议（高风险代写保护）</div>
                    {feedback.feedback_json.framework_only_tips.map((tip, i) => (
                      <div key={i} className="text-xs" style={{ color: "#9a3412" }}>• {tip}</div>
                    ))}
                  </div>
                )}
                {feedback.feedback_json?.cognitive_audit && (
                  <div className="rounded-2xl p-4 shadow-theme-sm" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                    <div className="text-xs font-medium mb-2" style={{ color: "var(--color-text)" }}>认知审计</div>
                    <div className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
                      自改：{feedback.feedback_json.cognitive_audit.revision_applied ? "是" : "否"} ·
                      反思质量：{Math.round((feedback.feedback_json.cognitive_audit.reflection_quality || 0) * 100)}%
                    </div>
                    {feedback.feedback_json.cognitive_audit.ghostwriting_risk && (
                      <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        代写风险：{feedback.feedback_json.cognitive_audit.ghostwriting_risk.level.toUpperCase()}（{feedback.feedback_json.cognitive_audit.ghostwriting_risk.score}）
                      </div>
                    )}
                  </div>
                )}
                {feedback.feedback_json?.cognitive_audit && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl p-3" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text)" }}>原稿</p>
                      <p className="text-[10px] whitespace-pre-wrap max-h-36 overflow-y-auto" style={{ color: "var(--color-text-secondary)" }}>
                        {feedback.feedback_json.cognitive_audit.draft_content || content}
                      </p>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text)" }}>改稿</p>
                      <p className="text-[10px] whitespace-pre-wrap max-h-36 overflow-y-auto" style={{ color: "var(--color-text-secondary)" }}>
                        {feedback.feedback_json.cognitive_audit.revised_content || revisedContent || content}
                      </p>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                      <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text)" }}>AI建议</p>
                      <p className="text-[10px] whitespace-pre-wrap max-h-36 overflow-y-auto" style={{ color: "var(--color-text-secondary)" }}>
                        {feedback.feedback_json.improvements?.join("\n") || feedback.feedback_json.summary || "暂无"}
                      </p>
                    </div>
                  </div>
                )}
                {feedback.feedback_json?.corrected_sentences && feedback.feedback_json.corrected_sentences.length > 0 && (
                  <div className="card-gradient-writing p-4 shadow-theme-sm">
                    <div className="text-xs font-medium mb-2" style={{ color: "var(--color-text)" }}>句子修改</div>
                    <div className="space-y-2">
                      {feedback.feedback_json.corrected_sentences.map((c, i) => (
                        <div key={i} className="text-xs rounded-lg p-2" style={{ background: "var(--color-bg)" }}>
                          <div className="text-red-600 line-through">{c.original}</div>
                          <div className="text-green-600">{c.corrected}</div>
                          <div style={{ color: "var(--color-text-secondary)" }}>{c.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={resetGuided}
                  className="w-full py-2.5 rounded-full text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] shadow-theme-sm"
                  style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
                >
                  写新作文
                </button>
              </div>
            )}
          </div>
        )}

        {/* FREE WRITING (original) */}
        {tab === "free" && (
          <div className="card-gradient-writing p-5 shadow-theme-sm">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="写作题目（可选）"
              className="w-full border rounded-xl p-3 text-sm resize-none focus:outline-none mb-3 transition-all duration-200"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)" }}
              rows={2}
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing..."
              className="w-full border rounded-xl p-3 text-sm resize-none focus:outline-none transition-all duration-200"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)", minHeight: 200 }}
              rows={8}
            />
            <button
              onClick={handleSubmit}
              disabled={loading || !content.trim()}
              className="mt-3 px-6 py-2.5 rounded-full text-sm font-medium text-white disabled:opacity-30 transition-all duration-200 hover:scale-105 active:scale-95 shadow-theme-sm"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
            >
              {loading ? "批改中..." : "提交批改"}
            </button>
            {feedback && (
              <div className="mt-4 pt-3">
                <div className="gradient-divider mb-3" />
                <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {feedback.score !== null && (
                    <span className="font-medium text-gradient">得分：{feedback.score}/100</span>
                  )}
                </div>
                {feedback.feedback_json?.summary && (
                  <div className="mt-1 text-sm" style={{ color: "var(--color-text)" }}>{feedback.feedback_json.summary}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <div>
            {historyLoading ? (
              <div className="space-y-3"><Skeleton className="h-20 w-full rounded-2xl" /><Skeleton className="h-20 w-full rounded-2xl" /></div>
            ) : (
              <>
                {scoreData.length >= 2 && (
                  <div className="card-gradient-writing p-4 mb-4 shadow-theme-sm">
                    <h3 className="text-sm font-medium mb-2" style={{ color: "var(--color-text)" }}>分数趋势</h3>
                    <ScoreChart data={scoreData} />
                  </div>
                )}
                <HistoryTimeline items={history} />
              </>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
