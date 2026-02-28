"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useExamStore } from "@/stores/exam";
import Link from "next/link";
import CognitiveEntryButton from "@/components/cognitive/CognitiveEntryButton";

const PART_LABELS: Record<number, string> = { 1: "第一部分", 2: "第二部分", 3: "第三部分", 4: "第四部分" };

interface ExamPage {
  part: number;
  partLabel: string;
  sectionKey: string;
  sectionLabel: string;
  instruction: string;
  perScore: number | undefined;
  sectionScore: number;
  questions: { id: number; content: string; options: string[]; passage_text?: string; difficulty: number; passage_group?: string; passage_index?: number }[];
  passageText: string | null;
  globalStart: number;
  type: "choice" | "cloze" | "grammar_fill" | "seven_choose_five" | "writing";
  isFirstPageOfPart: boolean;
}

export default function MockPage() {
  const {
    profile, currentMock, mockResult, mockHistory, loading,
    startMock, submitMock, fetchMockResult, fetchMockHistory,
  } = useExamStore();

  const [phase, setPhase] = useState<"list" | "exam" | "result">("list");
  const [pageIdx, setPageIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [showAnswerCard, setShowAnswerCard] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchMockHistory(); }, [fetchMockHistory]);

  // Timer
  useEffect(() => {
    if (phase !== "exam" || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft]);

  const handleStart = async () => {
    await startMock(profile?.exam_type);
    setPhase("exam");
    setPageIdx(0);
    setAnswers({});
    setShowAnswerCard(false);
  };

  useEffect(() => {
    if (currentMock) setTimeLeft(currentMock.time_limit_minutes * 60);
  }, [currentMock]);

  // Build pages array from sections
  const pages: ExamPage[] = useMemo(() => {
    if (!currentMock) return [];
    const result: ExamPage[] = [];
    let globalQ = 0;
    const seenParts = new Set<number>();

    for (const sec of currentMock.sections) {
      const partNum = sec.part ?? 1;
      const partLabel = PART_LABELS[partNum] || `第${partNum}部分`;
      const isFirstOfPart = !seenParts.has(partNum);
      seenParts.add(partNum);

      const sectionType: ExamPage["type"] =
        sec.section === "cloze" ? "cloze" :
        sec.section === "grammar_fill" ? "grammar_fill" :
        sec.section === "seven_choose_five" ? "seven_choose_five" :
        ["writing", "application_writing", "continuation_writing"].includes(sec.section) ? "writing" : "choice";

      const hasGroups = sec.passage_groups && sec.passage_groups.length > 0
        && sec.passage_groups.some(pg => pg.questions.length > 0);

      if (hasGroups) {
        let firstInPart = isFirstOfPart;
        for (const pg of sec.passage_groups) {
          if (pg.questions.length === 0) continue;
          const passageText = pg.questions[0]?.passage_text || null;
          result.push({
            part: partNum, partLabel, sectionKey: sec.section, sectionLabel: sec.label,
            instruction: sec.instruction || "", perScore: sec.per_score,
            sectionScore: sec.score, questions: pg.questions, passageText,
            globalStart: globalQ, type: sectionType, isFirstPageOfPart: firstInPart,
          });
          globalQ += pg.questions.length;
          firstInPart = false;
        }
      } else {
        const passageText = sec.questions[0]?.passage_text || null;
        result.push({
          part: partNum, partLabel, sectionKey: sec.section, sectionLabel: sec.label,
          instruction: sec.instruction || "", perScore: sec.per_score,
          sectionScore: sec.score, questions: sec.questions, passageText,
          globalStart: globalQ, type: sectionType, isFirstPageOfPart: isFirstOfPart,
        });
        globalQ += sec.questions.length;
      }
    }
    return result;
  }, [currentMock]);

  const totalQuestions = useMemo(() => {
    if (!currentMock) return 0;
    return currentMock.sections.reduce((s, sec) => s + sec.questions.length, 0);
  }, [currentMock]);

  const currentPage = pages[pageIdx] as ExamPage | undefined;

  // Map question id -> page index (for answer card navigation)
  const questionPageMap = useMemo(() => {
    const map: Record<number, number> = {};
    pages.forEach((p, pi) => p.questions.forEach(q => { map[q.id] = pi; }));
    return map;
  }, [pages]);

  const handleSelectOption = (questionId: number, opt: string) => {
    const letter = opt.match(/^([A-G])/)?.[1] ?? opt;
    setAnswers(prev => ({ ...prev, [questionId]: letter }));
  };

  const goToPage = useCallback((idx: number) => {
    setPageIdx(idx);
    setShowAnswerCard(false);
    scrollRef.current?.scrollTo(0, 0);
  }, []);

  const handleSubmit = async () => {
    if (!currentMock) return;
    const answerList = Object.entries(answers).map(([qid, ans]) => ({
      question_id: Number(qid), answer: ans, time_spent: 0,
    }));
    await submitMock(answerList);
    setPhase("result");
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  // ── No profile ──
  if (!profile) {
    return (
      <div className="text-center py-16">
        <p style={{ color: "var(--color-text-secondary)" }}>请先完成考试冲刺设置</p>
        <Link href="/exam" className="mt-3 inline-block px-4 py-2 rounded-lg text-white"
          style={{ background: "var(--color-primary)" }}>前往设置</Link>
      </div>
    );
  }

  // ── Result phase ──
  if (phase === "result" && mockResult) {
    const score = mockResult.score as { total: number; max: number; sections: Record<string, { label?: string; score: number; max: number }> } | undefined;
    const report = mockResult.ai_report as { overall_comment?: string; strengths?: string[]; weaknesses?: string[]; suggestions?: string[]; estimated_rank?: string } | undefined;
    return (
      <div className="max-w-2xl mx-auto space-y-4 p-4">
        <div className="text-center py-6">
          <div className="text-5xl font-bold mb-2" style={{ color: "var(--color-primary)" }}>
            {score?.total ?? 0}<span className="text-lg font-normal" style={{ color: "var(--color-text-secondary)" }}>/{score?.max ?? 150}</span>
          </div>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>模考完成</p>
          {report?.estimated_rank && (
            <p className="text-sm mt-1" style={{ color: "var(--color-primary)" }}>预估排名：{report.estimated_rank}</p>
          )}
        </div>

        {score?.sections && (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(score.sections).map(([sec, s]) => (
              <div key={sec} className="p-3 rounded-xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{s.label || sec}</p>
                <p className="text-lg font-bold" style={{ color: "var(--color-text)" }}>{s.score}/{s.max}</p>
              </div>
            ))}
          </div>
        )}

        {report?.overall_comment && (
          <div className="p-4 rounded-xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
            <p className="text-sm font-medium mb-2" style={{ color: "var(--color-text)" }}>AI 分析</p>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{report.overall_comment}</p>
          </div>
        )}

        {report?.suggestions && report.suggestions.length > 0 && (
          <div className="p-4 rounded-xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
            <p className="text-sm font-medium mb-2" style={{ color: "var(--color-text)" }}>改进建议</p>
            <ul className="space-y-1">
              {report.suggestions.map((s, i) => (
                <li key={i} className="text-sm" style={{ color: "var(--color-text-secondary)" }}>• {s}</li>
              ))}
            </ul>
          </div>
        )}

        <button onClick={() => { setPhase("list"); fetchMockHistory(); }}
          className="w-full py-3 rounded-xl text-white font-medium"
          style={{ background: "var(--color-primary)" }}>返回</button>
      </div>
    );
  }

  // ── Exam phase ──
  if (phase === "exam" && currentMock && currentPage) {
    const answeredCount = Object.keys(answers).length;

    return (
      <div ref={scrollRef} className="max-w-3xl mx-auto p-4 pb-28 overflow-y-auto" style={{ maxHeight: "100vh" }}>
        {/* Top bar: timer + progress */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 rounded-full font-medium"
              style={{
                background: timeLeft < 300 ? "#fef2f2" : "var(--color-bg)",
                color: timeLeft < 300 ? "#ef4444" : "var(--color-text)",
                border: "1px solid var(--color-border)",
              }}>
              {formatTime(timeLeft)}
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              已答 {answeredCount}/{totalQuestions}
            </span>
          </div>
          <button onClick={() => setShowAnswerCard(!showAnswerCard)}
            className="text-xs px-3 py-1 rounded-full"
            style={{ background: "var(--color-bg)", color: "var(--color-primary)", border: "1px solid var(--color-border)" }}>
            答题卡
          </button>
        </div>

        {/* Part title — only on first page of each part */}
        {currentPage.isFirstPageOfPart && (
          <div className="mb-3 text-center">
            <span className="text-sm font-bold px-4 py-1.5 rounded-full"
              style={{ background: "var(--color-primary)", color: "white" }}>
              {currentPage.partLabel}
            </span>
          </div>
        )}

        {/* Section label + instruction */}
        <div className="mb-3">
          <h2 className="text-base font-bold mb-1" style={{ color: "var(--color-text)" }}>
            {currentPage.sectionLabel}
          </h2>
          {currentPage.instruction && (
            <div className="px-3 py-2 rounded-lg text-xs leading-relaxed"
              style={{ background: "#f0f9ff", color: "#0369a1", border: "1px solid #bae6fd" }}>
              {currentPage.instruction}
            </div>
          )}
        </div>

        {/* Passage text — full display */}
        {currentPage.passageText && (
          <div className="mb-4 p-4 rounded-xl text-sm leading-relaxed"
            style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
            <div className="whitespace-pre-wrap">{currentPage.passageText}</div>
          </div>
        )}

        {/* Questions list — render by type */}
        {currentPage.type === "writing" ? (
          /* ── Writing ── */
          <div className="space-y-4">
            {currentPage.questions.map((q, qi) => (
              <div key={q.id} id={`q-${q.id}`}>
                <div className="mb-2 p-4 rounded-xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "var(--color-primary)", color: "white" }}>
                      {currentPage.globalStart + qi + 1}
                    </span>
                    {currentPage.perScore && (
                      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>({currentPage.perScore}分)</span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>{q.content}</p>
                </div>
                <textarea
                  value={answers[q.id] || ""}
                  onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="在此输入你的作文..."
                  rows={12}
                  className="w-full p-4 rounded-xl text-sm resize-none leading-relaxed"
                  style={{ background: "var(--color-card)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
                />
                <div className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  词数：{wordCount(answers[q.id] || "")}
                </div>
              </div>
            ))}
          </div>
        ) : currentPage.type === "cloze" ? (
          /* ── Cloze: compact 2-column layout ── */
          <div className="grid grid-cols-2 gap-2">
            {currentPage.questions.map((q, qi) => {
              const num = currentPage.globalStart + qi + 1;
              return (
                <div key={q.id} id={`q-${q.id}`} className="p-3 rounded-xl"
                  style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                  <p className="text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] mr-1"
                      style={{ background: "var(--color-primary)", color: "white" }}>{num}</span>
                    {q.content}
                  </p>
                  <div className="space-y-1">
                    {q.options.map((opt, oi) => {
                      const letter = opt.match(/^([A-D])/)?.[1] ?? String.fromCharCode(65 + oi);
                      const isSelected = answers[q.id] === letter;
                      return (
                        <button key={oi} onClick={() => handleSelectOption(q.id, opt)}
                          className="w-full text-left px-2 py-1 rounded-lg text-xs transition-all"
                          style={{
                            background: isSelected ? "var(--color-primary)" : "transparent",
                            color: isSelected ? "white" : "var(--color-text)",
                            border: `1px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                          }}>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : currentPage.type === "grammar_fill" ? (
          /* ── Grammar fill: input per question ── */
          <div className="space-y-3">
            {currentPage.questions.map((q, qi) => {
              const num = currentPage.globalStart + qi + 1;
              return (
                <div key={q.id} id={`q-${q.id}`} className="p-3 rounded-xl flex items-start gap-3"
                  style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                  <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium"
                    style={{ background: "var(--color-primary)", color: "white" }}>{num}</span>
                  <div className="flex-1">
                    <p className="text-sm mb-2" style={{ color: "var(--color-text)" }}>{q.content}</p>
                    <input type="text" value={answers[q.id] || ""}
                      onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="输入答案..."
                      className="w-full px-3 py-1.5 rounded-lg text-sm"
                      style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : currentPage.type === "seven_choose_five" ? (
          /* ── Seven choose five ── */
          <div className="space-y-3">
            {currentPage.questions.map((q, qi) => {
              const num = currentPage.globalStart + qi + 1;
              return (
                <div key={q.id} id={`q-${q.id}`} className="p-4 rounded-xl"
                  style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "var(--color-primary)", color: "white" }}>{num}</span>
                  </div>
                  <p className="text-sm mb-3 whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>{q.content}</p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => {
                      const letter = opt.match(/^([A-G])/)?.[1] ?? String.fromCharCode(65 + oi);
                      const isSelected = answers[q.id] === letter;
                      return (
                        <button key={oi} onClick={() => handleSelectOption(q.id, opt)}
                          className="w-full text-left p-2.5 rounded-xl text-sm transition-all"
                          style={{
                            background: isSelected ? "var(--color-primary)" : "transparent",
                            color: isSelected ? "white" : "var(--color-text)",
                            border: `1.5px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                          }}>{opt}</button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Default choice (reading, single choice, etc.) ── */
          <div className="space-y-3">
            {currentPage.questions.map((q, qi) => {
              const num = currentPage.globalStart + qi + 1;
              return (
                <div key={q.id} id={`q-${q.id}`} className="p-4 rounded-xl"
                  style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "var(--color-primary)", color: "white" }}>{num}</span>
                    {currentPage.perScore && (
                      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>({currentPage.perScore}分)</span>
                    )}
                  </div>
                  <p className="text-sm mb-3 whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>{q.content}</p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => {
                      const letter = opt.match(/^([A-D])/)?.[1] ?? String.fromCharCode(65 + oi);
                      const isSelected = answers[q.id] === letter;
                      return (
                        <button key={oi} onClick={() => handleSelectOption(q.id, opt)}
                          className="w-full text-left p-2.5 rounded-xl text-sm transition-all"
                          style={{
                            background: isSelected ? "var(--color-primary)" : "transparent",
                            color: isSelected ? "white" : "var(--color-text)",
                            border: `1.5px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                          }}>{opt}</button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Fixed bottom navigation bar ── */}
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between gap-3 max-w-3xl mx-auto"
          style={{ background: "var(--color-card)", borderTop: "1px solid var(--color-border)" }}>
          <button onClick={() => pageIdx > 0 && goToPage(pageIdx - 1)}
            disabled={pageIdx === 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)", opacity: pageIdx === 0 ? 0.4 : 1 }}>
            上一页
          </button>
          <span className="text-xs flex-shrink-0" style={{ color: "var(--color-text-secondary)" }}>
            {pageIdx + 1} / {pages.length}
          </span>
          {pageIdx + 1 < pages.length ? (
            <button onClick={() => goToPage(pageIdx + 1)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: "var(--color-primary)" }}>
              下一页
            </button>
          ) : (
            <button onClick={handleSubmit}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: "#22c55e" }}>
              交卷 ({answeredCount}/{totalQuestions})
            </button>
          )}
        </div>
        {showAnswerCard && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
            <div className="w-full max-w-lg rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto"
              style={{ background: "var(--color-card)" }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold" style={{ color: "var(--color-text)" }}>
                  答题卡 ({answeredCount}/{totalQuestions})
                </h3>
                <button onClick={() => setShowAnswerCard(false)} className="text-xl"
                  style={{ color: "var(--color-text-secondary)" }}>×</button>
              </div>
              {pages.map((pg, pi) => (
                <div key={pi} className="mb-3">
                  <p className="text-xs font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
                    {pg.sectionLabel}{pages.filter(p => p.sectionKey === pg.sectionKey).length > 1
                      ? ` (${pages.filter(p => p.sectionKey === pg.sectionKey).indexOf(pg) + 1})`
                      : ""}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {pg.questions.map((q, qi) => {
                      const num = pg.globalStart + qi + 1;
                      const isAnswered = !!answers[q.id];
                      const isOnPage = pi === pageIdx;
                      return (
                        <button key={q.id}
                          onClick={() => { goToPage(pi); setTimeout(() => document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100); }}
                          className="w-8 h-8 rounded-lg text-xs font-medium flex items-center justify-center"
                          style={{
                            background: isOnPage ? "var(--color-primary)" : isAnswered ? "#22c55e" : "var(--color-bg)",
                            color: (isOnPage || isAnswered) ? "white" : "var(--color-text-secondary)",
                            border: `1px solid ${isOnPage ? "var(--color-primary)" : isAnswered ? "#22c55e" : "var(--color-border)"}`,
                          }}>{num}</button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button onClick={handleSubmit}
                className="w-full py-3 rounded-xl text-white font-medium mt-2"
                style={{ background: "#22c55e" }}>
                交卷 ({answeredCount}/{totalQuestions})
              </button>
            </div>
          </div>
        )}
        <CognitiveEntryButton questionId={currentPage.questions[0]?.id ?? 0} questionText={currentPage.questions[0]?.content ?? ""} source="exam" />
      </div>
    );
  }
  return (
    <div className="max-w-2xl mx-auto space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>全真模考</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            真题组卷，对标{profile.exam_type === "gaokao" ? "新高考全国卷" : "中考通用卷"}，严格模拟真实考试
          </p>
        </div>
        <button onClick={handleStart} disabled={loading}
          className="px-5 py-2.5 rounded-xl text-white font-medium"
          style={{ background: "var(--color-primary)", opacity: loading ? 0.6 : 1 }}>
          {loading ? "组卷中..." : "开始模考"}
        </button>
      </div>

      {mockHistory.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--color-text-secondary)" }}>
          <div className="text-4xl mb-3">📋</div>
          <p>暂无模考记录，开始你的第一次模考吧</p>
        </div>
      ) : (
        <div className="space-y-3">
          {mockHistory.map((m: Record<string, unknown>, i: number) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                  模考 #{(m.id as number) || i + 1}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {(m.started_at as string)?.slice(0, 10) || ""}
                </p>
              </div>
              <div className="text-right">
                {m.total_score != null && (
                  <span className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>
                    {m.total_score as number}/{m.max_score as number}
                  </span>
                )}
                {m.status === "in_progress" && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#fef3c7", color: "#d97706" }}>
                    进行中
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
