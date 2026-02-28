"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useExamStore } from "@/stores/exam";
import { api } from "@/lib/api";
import { tracker } from "@/lib/behavior-tracker";
import MasteryBar from "@/components/exam/mastery-bar";
import ProgressiveHintPanel, { type ProgressiveHintData } from "@/components/cognitive/ProgressiveHintPanel";
import AudioPlayer from "@/components/cognitive/AudioPlayer";
import TextHighlighter, { type Highlight } from "@/components/cognitive/TextHighlighter";
import ExpertDemo from "@/components/cognitive/ExpertDemo";
import SyncReader from "@/components/cognitive/SyncReader";
import PreAnswerGuide from "@/components/cognitive/PreAnswerGuide";
import ClozePassageReader from "@/components/reading/cloze-passage-reader";
import { useEnhancementConfig } from "@/hooks/use-enhancement-config";
import CognitiveEntryButton from "@/components/cognitive/CognitiveEntryButton";

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
  const { config: enhConfig } = useEnhancementConfig();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [feedback, setFeedback] = useState<ProgressiveHintData | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showExpertDemo, setShowExpertDemo] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

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

    // 映射后端返回数据为 ProgressiveHintData
    const hintData: ProgressiveHintData = {
      is_correct: result.is_correct as boolean,
      correct_answer: result.correct_answer as string | undefined,
      hint_levels: result.hint_levels as ProgressiveHintData["hint_levels"],
      guided_discovery: result.guided_discovery as ProgressiveHintData["guided_discovery"],
      how_to_spot: result.how_to_spot as string | undefined,
      key_clues: result.key_clues as { text: string; role: string }[] | undefined,
      common_trap: result.common_trap as string | undefined,
      method: result.method as string | undefined,
      explanation: result.explanation as string | undefined,
      knowledge_point: result.knowledge_point as string | undefined,
      mastery_before: result.mastery_before as number | undefined,
      mastery_after: result.mastery_after as number | undefined,
    };
    setFeedback(hintData);
    setAnsweredCount(a => a + 1);

    // 提取题眼分析的高亮数据
    const analysis = result.analysis as {
      key_phrases?: { text: string; role: string; start?: number; end?: number }[];
      question_eye?: string;
    } | undefined;
    if (analysis) {
      const hl: Highlight[] = [];
      if (analysis.question_eye) {
        const qText = trainingQuestions[currentIndex].content;
        const idx = qText.indexOf(analysis.question_eye);
        hl.push({
          text: analysis.question_eye,
          start: idx >= 0 ? idx : 0,
          end: idx >= 0 ? idx + analysis.question_eye.length : analysis.question_eye.length,
          type: "question_eye",
          label: "题眼",
        });
      }
      if (analysis.key_phrases) {
        for (const kp of analysis.key_phrases) {
          const qText = trainingQuestions[currentIndex].content;
          const idx = qText.indexOf(kp.text);
          const type = kp.role === "signal_word" ? "signal_word"
            : kp.role === "context_clue" ? "clue"
            : kp.role === "key_info" ? "key_phrase"
            : "key_phrase";
          hl.push({
            text: kp.text,
            start: kp.start ?? (idx >= 0 ? idx : 0),
            end: kp.end ?? (idx >= 0 ? idx + kp.text.length : kp.text.length),
            type: type as Highlight["type"],
            label: kp.role,
          });
        }
      }
      setHighlights(hl);
    }
  };

  const handleNext = () => {
    setFeedback(null);
    setSelectedAnswer("");
    setHighlights([]);
    setShowExpertDemo(false);
    setShowGuide(false);
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
              {feedback && highlights.length > 0 ? (
                <TextHighlighter text={q.content} highlights={highlights} />
              ) : (
                q.content
              )}
            </p>
            <div className="mt-2">
              <AudioPlayer text={q.content} compact label="朗读题目" autoPlay={enhConfig.auto_tts} />
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

          {/* 答题前审题引导 */}
          {!feedback && !showGuide && (
            <button onClick={() => setShowGuide(true)}
              className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: "rgba(59,130,246,0.08)", color: "#2563eb", border: "1px solid rgba(59,130,246,0.2)" }}>
              🧠 不会审题？点这里让学霸教你
            </button>
          )}
          {!feedback && showGuide && (
            <PreAnswerGuide
              questionId={q.id}
              questionText={q.content}
              optionsText={q.options.join("\n")}
              questionType={section}
              source="exam"
              onClose={() => setShowGuide(false)}
            />
          )}

          {/* Feedback: 渐进式提示面板 */}
          {feedback && (
            <div className="space-y-3">
              <ProgressiveHintPanel
                data={feedback}
                onRetry={() => {
                  setFeedback(null);
                  setSelectedAnswer("");
                  setHighlights([]);
                }}
                onComplete={handleNext}
              />

              {/* 视听同步跟读 */}
              {q.content && (
                <SyncReader text={q.content} className="px-4" />
              )}

              {/* 学霸审题演示（按需展开） */}
              {!showExpertDemo ? (
                <button onClick={() => setShowExpertDemo(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: "var(--color-bg)", color: "var(--color-primary)", border: "1px solid var(--color-primary)" }}>
                  👀 看学霸怎么审这道题
                </button>
              ) : (
                <ExpertDemo questionText={q.content} questionId={q.id} source="exam" />
              )}
            </div>
          )}

          {/* Action button: 只在未提交时显示提交按钮 */}
          {!feedback && (
            <button onClick={handleSubmit} disabled={!selectedAnswer}
              className="w-full py-3 rounded-xl text-white font-medium"
              style={{ background: "var(--color-primary)", opacity: selectedAnswer ? 1 : 0.5 }}>
              提交答案
            </button>
          )}
        </>
      )}
      <CognitiveEntryButton questionId={q?.id ?? 0} questionText={q?.content ?? ""} source="exam" />
    </div>
  );
}
