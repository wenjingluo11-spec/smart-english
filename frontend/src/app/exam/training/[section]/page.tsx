"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useExamStore } from "@/stores/exam";
import AnswerFeedback from "@/components/exam/answer-feedback";

const SECTION_LABELS: Record<string, string> = {
  listening: "听力理解", reading: "阅读理解", cloze: "完形填空",
  grammar_fill: "语法填空", error_correction: "短文改错", writing: "书面表达",
};

const STRATEGY_OPTIONS = [
  "先定位关键词再判断",
  "先排除明显错误选项",
  "先判断语法结构",
  "先提炼题干逻辑",
];

export default function SectionTrainingPage() {
  const params = useParams();
  const section = params.section as string;
  const { profile, trainingQuestions, loading, fetchTrainingQuestions, submitTrainingAnswer } = useExamStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [strategyChoice, setStrategyChoice] = useState("");
  const [reflectionText, setReflectionText] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [feedback, setFeedback] = useState<Record<string, unknown> | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);

  useEffect(() => {
    if (profile) fetchTrainingQuestions(section, 10);
  }, [profile, section, fetchTrainingQuestions]);

  const handleSubmit = async () => {
    if (!selectedAnswer || !trainingQuestions[currentIndex]) return;
    setSubmitError("");
    if (!strategyChoice) {
      setSubmitError("请先选择本题作答策略。");
      return;
    }
    if (!reflectionText.trim()) {
      setSubmitError("请先填写错因/思路自解释。");
      return;
    }
    const result = await submitTrainingAnswer(
      trainingQuestions[currentIndex].id,
      selectedAnswer,
      strategyChoice,
      reflectionText.trim()
    );
    setFeedback(result);
    setAnsweredCount(a => a + 1);
  };

  const handleNext = () => {
    setFeedback(null);
    setSelectedAnswer("");
    setStrategyChoice("");
    setReflectionText("");
    setSubmitError("");
    if (currentIndex + 1 < trainingQuestions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 加载更多题目
      fetchTrainingQuestions(section, 10);
      setCurrentIndex(0);
    }
  };

  if (loading && trainingQuestions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 rounded-full" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const q = trainingQuestions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
            {SECTION_LABELS[section] || section} 专项训练
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
            已完成 {answeredCount} 题 · 自适应难度
          </p>
        </div>
        <Link href="/exam/training" className="text-sm px-3 py-1.5 rounded-lg" style={{ color: "var(--color-primary)", background: "var(--color-primary-light)" }}>
          返回
        </Link>
      </div>

      {!q ? (
        <div className="text-center py-16" style={{ color: "var(--color-text-secondary)" }}>
          <div className="text-4xl mb-3">📭</div>
          <p>该题型暂无题目，请先运行种子数据导入</p>
        </div>
      ) : (
        <>
          {/* Question card */}
          <div className="p-5 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
                难度 {"★".repeat(q.difficulty)}{"☆".repeat(5 - q.difficulty)}
              </span>
              {q.strategy_tip && (
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>💡 {q.strategy_tip}</span>
              )}
            </div>

            {q.passage_text && (
              <div className="mb-4 p-3 rounded-lg text-sm leading-relaxed" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
                {q.passage_text}
              </div>
            )}

            <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
              {q.content}
            </p>

            <div className="mt-4 rounded-xl p-3" style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
              <p className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>先选择你的作答策略</p>
              <div className="grid grid-cols-2 gap-2">
                {STRATEGY_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={!!feedback}
                    onClick={() => setStrategyChoice(item)}
                    className="text-xs px-2 py-2 rounded-lg text-left transition-all"
                    style={{
                      background: strategyChoice === item ? "var(--color-primary-light)" : "var(--color-card)",
                      border: `1px solid ${strategyChoice === item ? "var(--color-primary)" : "var(--color-border)"}`,
                      color: strategyChoice === item ? "var(--color-primary)" : "var(--color-text)",
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {q.options.length > 0 ? (
              <div className="mt-4 space-y-2">
                {q.options.map((opt, i) => (
                  <button key={i} onClick={() => !feedback && setSelectedAnswer(opt.charAt(0))}
                    disabled={!!feedback}
                    className="w-full text-left px-4 py-3 rounded-xl transition-all text-sm"
                    style={{
                      background: selectedAnswer === opt.charAt(0) ? "var(--color-primary-light)" : "var(--color-bg)",
                      border: `2px solid ${selectedAnswer === opt.charAt(0) ? "var(--color-primary)" : "var(--color-border)"}`,
                      color: "var(--color-text)",
                      opacity: feedback ? 0.8 : 1,
                    }}>
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                value={selectedAnswer} onChange={e => setSelectedAnswer(e.target.value)}
                disabled={!!feedback}
                placeholder="请输入你的答案..."
                className="w-full mt-4 px-4 py-3 rounded-xl text-sm resize-none"
                style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", minHeight: 80 }}
              />
            )}

            <div className="mt-4">
              <p className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
                写下你的思路或错因自解释（提交后用于认知反馈）
              </p>
              <textarea
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                disabled={!!feedback}
                placeholder="例如：我先排除时态不一致选项，但在主谓一致上犹豫..."
                className="w-full px-4 py-3 rounded-xl text-sm resize-none"
                style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", minHeight: 90 }}
              />
            </div>
          </div>

          {/* Feedback */}
          {feedback && <AnswerFeedback feedback={feedback} />}
          {submitError && (
            <p className="text-xs" style={{ color: "#dc2626" }}>{submitError}</p>
          )}

          {/* Action button */}
          {!feedback ? (
            <button onClick={handleSubmit} disabled={!selectedAnswer || !strategyChoice || !reflectionText.trim()}
              className="w-full py-3 rounded-xl text-white font-medium"
              style={{ background: "var(--color-primary)", opacity: selectedAnswer && strategyChoice && reflectionText.trim() ? 1 : 0.5 }}>
              提交答案
            </button>
          ) : (
            <button onClick={handleNext}
              className="w-full py-3 rounded-xl text-white font-medium"
              style={{ background: "var(--color-primary)" }}>
              下一题
            </button>
          )}
        </>
      )}
    </div>
  );
}
