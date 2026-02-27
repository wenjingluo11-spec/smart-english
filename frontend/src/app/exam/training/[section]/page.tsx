"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useExamStore } from "@/stores/exam";
import { api } from "@/lib/api";
import { tracker } from "@/lib/behavior-tracker";
import MasteryBar from "@/components/exam/mastery-bar";
import AnswerFeedback from "@/components/exam/answer-feedback";
import AudioPlayer from "@/components/cognitive/AudioPlayer";
import ClozePassageReader from "@/components/reading/cloze-passage-reader";

const SECTION_LABELS: Record<string, string> = {
  listening: "听力理解", reading: "阅读理解", cloze: "完形填空",
  grammar_fill: "语法填空", error_correction: "短文改错", writing: "书面表达",
};

interface ClozeAnalysis {
  blanks: { blank_index: number; context_clues: { text: string; position: "before" | "after"; clue_type: string; hint: string }[]; blank_type: string; strategy: string }[];
  overview_strategy: string;
  passage_keywords: string[];
  difficulty_blanks: number[];
  solving_order: string;
}

export default function SectionTrainingPage() {
  const params = useParams();
  const section = params.section as string;
  const { profile, trainingQuestions, loading, fetchTrainingQuestions, submitTrainingAnswer } = useExamStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedback, setFeedback] = useState<Record<string, unknown> | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);

  // V3.2: cloze cognitive enhancement
  const [clozeAnalysis, setClozeAnalysis] = useState<ClozeAnalysis | null>(null);
  const [clozeAnalysisLoading, setClozeAnalysisLoading] = useState(false);
  const [activeBlank, setActiveBlank] = useState<number | null>(null);

  useEffect(() => {
    if (profile) fetchTrainingQuestions(section, 10);
  }, [profile, section, fetchTrainingQuestions]);

  // V3.2: load cloze analysis when passage_text is available
  const q = trainingQuestions[currentIndex];

  // V4.1: track question view timing
  const viewTrackerRef = useRef<{ end: () => void } | null>(null);
  useEffect(() => {
    if (!q) return;
    viewTrackerRef.current?.end();
    viewTrackerRef.current = tracker.trackQuestionView(q.id, section);
    return () => { viewTrackerRef.current?.end(); viewTrackerRef.current = null; };
  }, [q?.id, section]);

  useEffect(() => {
    if (section !== "cloze" || !q?.passage_text) return;
    setClozeAnalysis(null);
    setClozeAnalysisLoading(true);
    setActiveBlank(null);
    api.post<ClozeAnalysis>("/exam/cloze/analyze", {
      passage_text: q.passage_text,
      questions: trainingQuestions.map((tq) => ({ content: tq.content, options: tq.options })),
    })
      .then(setClozeAnalysis)
      .catch(() => setClozeAnalysis(null))
      .finally(() => setClozeAnalysisLoading(false));
  }, [section, q?.passage_text, q?.id]);

  const handleBlankClick = useCallback((index: number) => {
    setActiveBlank((prev) => (prev === index ? null : index));
  }, []);

  const handleSubmit = async () => {
    if (!selectedAnswer || !trainingQuestions[currentIndex]) return;
    const result = await submitTrainingAnswer(trainingQuestions[currentIndex].id, selectedAnswer);
    setFeedback(result);
    setAnsweredCount(a => a + 1);
  };

  const handleNext = () => {
    setFeedback(null);
    setSelectedAnswer("");
    if (currentIndex + 1 < trainingQuestions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
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
        <a href="/exam/training" className="text-sm px-3 py-1.5 rounded-lg" style={{ color: "var(--color-primary)", background: "var(--color-primary-light)" }}>
          返回
        </a>
      </div>

      {!q ? (
        <div className="text-center py-16" style={{ color: "var(--color-text-secondary)" }}>
          <div className="text-4xl mb-3">📭</div>
          <p>该题型暂无题目，请先运行种子数据导入</p>
        </div>
      ) : (
        <>
          {/* V3.2: Cloze passage with cognitive enhancement */}
          {section === "cloze" && q.passage_text && (
            <ClozePassageReader
              passageText={q.passage_text}
              questions={trainingQuestions.map((tq) => ({ id: tq.id, content: tq.content, options: tq.options }))}
              analysis={clozeAnalysis}
              analysisLoading={clozeAnalysisLoading}
              activeBlank={activeBlank}
              onBlankClick={handleBlankClick}
            />
          )}

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

            {/* Non-cloze passage text (cloze uses ClozePassageReader above) */}
            {q.passage_text && section !== "cloze" && (
              <div className="mb-4 p-3 rounded-lg text-sm leading-relaxed" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
                {q.passage_text}
              </div>
            )}

            <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
              {q.content}
            </p>
            <div className="mt-2">
              <AudioPlayer text={q.content} compact label="朗读题目" />
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
          </div>

          {/* Feedback */}
          {feedback && <AnswerFeedback feedback={feedback} questionId={q.id} questionContent={q.content} source="exam" />}

          {/* Action button */}
          {!feedback ? (
            <button onClick={handleSubmit} disabled={!selectedAnswer}
              className="w-full py-3 rounded-xl text-white font-medium"
              style={{ background: "var(--color-primary)", opacity: selectedAnswer ? 1 : 0.5 }}>
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
