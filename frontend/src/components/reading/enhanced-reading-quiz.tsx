"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import ExpertDemo from "@/components/cognitive/ExpertDemo";

interface Question {
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
}

interface QuestionMapping {
  question_index: number;
  relevant_paragraph: number;
  evidence_text: string;
  evidence_start_char: number;
  question_type: string;
  core_info: string;
  distractor_analysis: { option: string; trap: string }[];
}

interface CognitiveFeedback {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  how_to_spot: string;
  key_clues: { text: string; role: string }[];
  common_trap: string;
  method: string;
}

interface EnhancedReadingQuizProps {
  materialId: number;
  questions: Question[];
  questionMapping: QuestionMapping[];
  /** 高亮原文段落回调 */
  onHighlightParagraph: (paragraphIndex: number | null) => void;
  /** 高亮原文证据句回调 */
  onHighlightEvidence?: (text: string | null) => void;
  onComplete: (score: number, total: number) => void;
  className?: string;
}

const QUESTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  detail: { label: "细节题", color: "#3b82f6" },
  inference: { label: "推断题", color: "#8b5cf6" },
  vocabulary: { label: "词义题", color: "#f59e0b" },
  main_idea: { label: "主旨题", color: "#10b981" },
  attitude: { label: "态度题", color: "#ec4899" },
};

/**
 * 增强版阅读理解测试组件 — 题文关联 + 认知增强反馈。
 *
 * 功能：
 * - 点击题目自动定位到原文相关段落并高亮
 * - 题干核心信息提取（折叠无关内容）
 * - 提交后显示认知增强反馈（审题思路 + 线索 + 陷阱 + 方法论）
 * - 显示原文证据句
 * - 干扰项分析
 */
export default function EnhancedReadingQuiz({
  materialId,
  questions,
  questionMapping,
  onHighlightParagraph,
  onHighlightEvidence,
  onComplete,
  className = "",
}: EnhancedReadingQuizProps) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<CognitiveFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);
  const [showCoreInfo, setShowCoreInfo] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  const q = questions[current];
  const mapping = questionMapping.find((m) => m.question_index === current);
  const typeInfo = mapping ? QUESTION_TYPE_LABELS[mapping.question_type] : null;

  // 当前题目变化时，高亮对应段落
  const highlightCurrentParagraph = useCallback(() => {
    if (mapping) {
      onHighlightParagraph(mapping.relevant_paragraph);
      // 滚动到对应段落
      const el = document.getElementById(`paragraph-${mapping.relevant_paragraph}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [mapping, onHighlightParagraph]);

  const handleSelect = (idx: number) => {
    if (feedback) return;
    setSelected(idx);
  };

  const handleSubmit = async () => {
    if (selected === null) return;
    setSubmitting(true);

    try {
      const letter = String.fromCharCode(65 + selected);
      const result = await api.post<CognitiveFeedback>(
        `/reading/${materialId}/submit-quiz`,
        { question_index: current, student_answer: letter }
      );
      setFeedback(result);
      if (result.is_correct) setScore((s) => s + 1);
    } catch {
      // fallback: 本地判断
      const isCorrect = selected === q.answer;
      if (isCorrect) setScore((s) => s + 1);
      setFeedback({
        is_correct: isCorrect,
        correct_answer: `${String.fromCharCode(65 + q.answer)}. ${q.options[q.answer]}`,
        explanation: q.explanation || "",
        how_to_spot: "",
        key_clues: [],
        common_trap: "",
        method: "",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    setSelected(null);
    setFeedback(null);
    setShowEvidence(false);
    onHighlightParagraph(null);
    onHighlightEvidence?.(null);

    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      onComplete(score, questions.length);
    }
  };

  if (!q) return null;

  const isLast = current === questions.length - 1;

  return (
    <div className={`${className}`}>
      <div className="gradient-divider mb-4" />

      {/* 题目头部 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
            阅读理解 ({current + 1}/{questions.length})
          </h4>
          {typeInfo && (
            <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: typeInfo.color }}>
              {typeInfo.label}
            </span>
          )}
        </div>
        {/* 定位按钮 */}
        {mapping && (
          <button
            onClick={highlightCurrentParagraph}
            className="text-xs px-2.5 py-1 rounded-lg transition-all hover:scale-105"
            style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}
          >
            定位原文 P{mapping.relevant_paragraph + 1}
          </button>
        )}
      </div>

      {/* 题干 */}
      <div className="mb-3">
        <p className="text-sm" style={{ color: "var(--color-text)", lineHeight: 1.7 }}>
          {q.question}
        </p>

        {/* 核心信息提取 */}
        {mapping?.core_info && (
          <button
            onClick={() => setShowCoreInfo(!showCoreInfo)}
            className="mt-1.5 text-xs transition-colors"
            style={{ color: "var(--color-primary)" }}
          >
            {showCoreInfo ? "▲ 收起核心信息" : "▼ 看题干核心信息"}
          </button>
        )}
        {showCoreInfo && mapping?.core_info && (
          <div className="mt-1.5 p-2.5 rounded-lg text-xs animate-slide-up"
            style={{ background: "rgba(59,130,246,0.06)", border: "1px dashed rgba(59,130,246,0.3)", color: "var(--color-text)" }}>
            <span style={{ color: "#3b82f6" }}>核心：</span>{mapping.core_info}
          </div>
        )}
      </div>

      {/* 选项 */}
      <div className="space-y-2 mb-4">
        {q.options.map((opt, idx) => {
          let bg = "var(--color-surface)";
          let border = "var(--color-border)";
          let textColor = "var(--color-text)";

          if (feedback) {
            if (idx === q.answer) {
              bg = "#dcfce7"; border = "#22c55e"; textColor = "#166534";
            } else if (idx === selected && idx !== q.answer) {
              bg = "#fee2e2"; border = "#ef4444"; textColor = "#991b1b";
            }
          } else if (idx === selected) {
            bg = "var(--color-primary-light, #dbeafe)";
            border = "var(--color-primary)";
          }

          // 干扰项分析标记
          const distractor = feedback && mapping?.distractor_analysis?.find((d) => d.option === String.fromCharCode(65 + idx));

          return (
            <div key={idx}>
              <button
                onClick={() => handleSelect(idx)}
                className="w-full text-left px-4 py-2.5 rounded-lg text-sm border transition-all"
                style={{ background: bg, borderColor: border, color: textColor }}
              >
                {String.fromCharCode(65 + idx)}. {opt}
              </button>
              {distractor && idx !== q.answer && (
                <div className="ml-4 mt-1 text-xs" style={{ color: "#9ca3af" }}>
                  陷阱：{distractor.trap}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 认知增强反馈 */}
      {feedback && (
        <div className="space-y-3 mb-4 animate-slide-up">
          {/* 学霸审题演示 — 答错时展示 */}
          {!feedback.is_correct && (
            <ExpertDemo
              questionText={q.question}
              questionId={materialId * 100 + current}
              source="practice"
            />
          )}
          {/* 审题思路 */}
          {feedback.how_to_spot && (
            <div className="p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <EyeIcon />
                <span className="text-xs font-medium" style={{ color: "#16a34a" }}>学霸怎么看出来的</span>
              </div>
              <p className="text-sm" style={{ color: "var(--color-text)", lineHeight: 1.6 }}>
                {feedback.how_to_spot}
              </p>
            </div>
          )}

          {/* 关键线索 */}
          {feedback.key_clues.length > 0 && (
            <div className="p-3 rounded-xl" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}>
              <span className="text-xs font-medium" style={{ color: "#2563eb" }}>关键线索</span>
              <div className="mt-1.5 space-y-1">
                {feedback.key_clues.map((clue, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white mt-0.5"
                      style={{ background: "#3b82f6" }}>{i + 1}</span>
                    <span style={{ color: "var(--color-text)" }}>
                      <strong style={{ color: "#2563eb" }}>{clue.text}</strong>
                      {clue.role && <span style={{ color: "var(--color-text-secondary)" }}> — {clue.role}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 常见陷阱 + 方法论 */}
          <div className="flex gap-2">
            {feedback.common_trap && (
              <div className="flex-1 p-3 rounded-xl" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <span className="text-xs font-medium" style={{ color: "#d97706" }}>常见陷阱</span>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>{feedback.common_trap}</p>
              </div>
            )}
            {feedback.method && (
              <div className="flex-1 p-3 rounded-xl" style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)" }}>
                <span className="text-xs font-medium" style={{ color: "#9333ea" }}>解题方法</span>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>{feedback.method}</p>
              </div>
            )}
          </div>

          {/* 原文证据 */}
          {mapping?.evidence_text && (
            <div>
              <button
                onClick={() => {
                  setShowEvidence(!showEvidence);
                  if (!showEvidence) {
                    onHighlightEvidence?.(mapping.evidence_text);
                    highlightCurrentParagraph();
                  } else {
                    onHighlightEvidence?.(null);
                  }
                }}
                className="text-xs transition-colors"
                style={{ color: "var(--color-primary)" }}
              >
                {showEvidence ? "▲ 收起原文证据" : "▼ 查看原文证据"}
              </button>
              {showEvidence && (
                <div className="mt-1.5 p-3 rounded-lg text-sm italic animate-slide-up"
                  style={{ background: "var(--color-surface-hover)", color: "var(--color-text)", borderLeft: "3px solid var(--color-primary)" }}>
                  &ldquo;{mapping.evidence_text}&rdquo;
                  <span className="block text-xs mt-1 not-italic" style={{ color: "var(--color-text-secondary)" }}>
                    — 第 {mapping.relevant_paragraph + 1} 段
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      {!feedback ? (
        <button
          onClick={handleSubmit}
          disabled={selected === null || submitting}
          className="px-5 py-2 rounded-lg text-sm text-white transition-all disabled:opacity-50"
          style={{ background: "var(--color-primary)" }}
        >
          {submitting ? "判题中..." : "提交答案"}
        </button>
      ) : (
        <button
          onClick={handleNext}
          className="px-5 py-2 rounded-lg text-sm text-white transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
        >
          {isLast ? `完成 (${score}/${questions.length})` : "下一题 →"}
        </button>
      )}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
