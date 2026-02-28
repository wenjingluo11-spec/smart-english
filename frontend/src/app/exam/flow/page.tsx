"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useExamStore } from "@/stores/exam";
import { useRouter } from "next/navigation";
import { tracker } from "@/lib/behavior-tracker";
import { useEnhancementConfig } from "@/hooks/use-enhancement-config";
import AudioPlayer from "@/components/cognitive/AudioPlayer";
import TextHighlighter, { type Highlight } from "@/components/cognitive/TextHighlighter";
import ProgressiveHintPanel, { type ProgressiveHintData } from "@/components/cognitive/ProgressiveHintPanel";
import PreAnswerGuide from "@/components/cognitive/PreAnswerGuide";
import CognitiveEntryButton from "@/components/cognitive/CognitiveEntryButton";

const SECTION_OPTIONS = [
  { value: "reading", label: "阅读理解" },
  { value: "cloze", label: "完形填空" },
  { value: "grammar_fill", label: "语法填空" },
  { value: "error_correction", label: "短文改错" },
];

const MILESTONES = [5, 10, 20, 50, 100];

export default function FlowPage() {
  const router = useRouter();
  const { config: enhConfig } = useEnhancementConfig();
  const { flowState, flowReport, loading, startFlow, submitFlowAnswer, endFlow } = useExamStore();

  const [phase, setPhase] = useState<"select" | "playing" | "report">("select");
  const [section, setSection] = useState("reading");
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ProgressiveHintData | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const startTimeRef = useRef<number>(0);

  // V4.1: behavior tracking
  const viewTrackerRef = useRef<{ end: () => void } | null>(null);
  useEffect(() => {
    if (!flowState?.question) return;
    viewTrackerRef.current?.end();
    viewTrackerRef.current = tracker.trackQuestionView(flowState.question.id, "exam");
    return () => { viewTrackerRef.current?.end(); viewTrackerRef.current = null; };
  }, [flowState?.question?.id]);

  const handleStart = async () => {
    await startFlow(section);
    setPhase("playing");
    startTimeRef.current = Date.now();
  };

  const [milestone, setMilestone] = useState<number | null>(null);

  const handleAnswer = useCallback(async (answer: string) => {
    if (!flowState?.question || selectedAnswer) return;
    setSelectedAnswer(answer);
    const responseMs = Date.now() - startTimeRef.current;

    const res = await submitFlowAnswer(flowState.question.id, answer, responseMs);

    const isCorrect = res.is_correct as boolean;
    setFlashColor(isCorrect ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)");
    tracker.track("answer_submit", { question_id: flowState.question.id, module: "exam" }, { event_data: { answer, is_correct: isCorrect, response_ms: responseMs } });

    const hintData: ProgressiveHintData = {
      is_correct: isCorrect,
      correct_answer: res.correct_answer as string | undefined,
      hint_levels: res.hint_levels as ProgressiveHintData["hint_levels"],
      guided_discovery: res.guided_discovery as ProgressiveHintData["guided_discovery"],
      how_to_spot: (res.how_to_spot as string) || undefined,
      key_clues: (res.key_clues as { text: string; role: string }[]) || undefined,
      common_trap: (res.common_trap as string) || undefined,
      method: (res.method as string) || undefined,
      explanation: (res.explanation as string) || undefined,
    };
    setFeedback(hintData);
    setMilestone((res.milestone as number) || null);
    setTotalAnswered((n) => n + 1);

    // 提取高亮数据
    const analysis = res.analysis as {
      key_phrases?: { text: string; role: string; start?: number; end?: number }[];
      question_eye?: string;
    } | undefined;
    if (analysis && flowState.question) {
      const hl: Highlight[] = [];
      const qText = flowState.question.content;
      if (analysis.question_eye) {
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
          const idx = qText.indexOf(kp.text);
          const type = kp.role === "signal_word" ? "signal_word"
            : kp.role === "context_clue" ? "clue"
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

    // 答对快切
    if (isCorrect) {
      setTimeout(() => {
        setSelectedAnswer(null);
        setFeedback(null);
        setHighlights([]);
        setFlashColor(null);
        setMilestone(null);
        setShowGuide(false);
        startTimeRef.current = Date.now();
      }, 500);
    }
  }, [flowState, selectedAnswer, submitFlowAnswer]);

  const handleEnd = async () => {
    await endFlow();
    setPhase("report");
  };

  // 报告页
  if (phase === "report" && flowReport) {
    return (
      <div className="max-w-lg mx-auto mt-8 p-6 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
        <h1 className="text-2xl font-bold text-center mb-6" style={{ color: "var(--color-text)" }}>🎯 心流战报</h1>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {[
            { label: "总题数", value: flowReport.total_questions },
            { label: "正确率", value: `${flowReport.accuracy}%` },
            { label: "最高连击", value: `🔥 ${flowReport.max_streak}` },
            { label: "获得 XP", value: `+${flowReport.xp_earned}` },
            { label: "平均用时", value: `${(flowReport.avg_response_ms / 1000).toFixed(1)}s` },
            { label: "总用时", value: `${Math.floor(flowReport.duration_seconds / 60)}分${flowReport.duration_seconds % 60}秒` },
          ].map((item) => (
            <div key={item.label} className="text-center p-3 rounded-xl" style={{ background: "var(--color-bg)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>{item.label}</div>
              <div className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setPhase("select"); setTotalAnswered(0); }}
            className="flex-1 py-3 rounded-xl font-medium" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>
            再来一局
          </button>
          <button onClick={() => router.push("/exam")}
            className="flex-1 py-3 rounded-xl font-medium text-white" style={{ background: "var(--color-primary)" }}>
            返回
          </button>
        </div>
      </div>
    );
  }

  // 选择页
  if (phase === "select") {
    return (
      <div className="max-w-lg mx-auto mt-8 p-6 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text)" }}>🎯 心流刷题</h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>
          全屏沉浸、连击计数、即时反馈，进入刷题心流状态
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-text)" }}>选择题型</label>
          <div className="grid grid-cols-2 gap-2">
            {SECTION_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setSection(opt.value)}
                className="py-3 rounded-xl text-center text-sm font-medium transition-all"
                style={{
                  background: section === opt.value ? "var(--color-primary)" : "var(--color-bg)",
                  color: section === opt.value ? "white" : "var(--color-text)",
                  border: `2px solid ${section === opt.value ? "var(--color-primary)" : "var(--color-border)"}`,
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleStart} disabled={loading}
          className="w-full py-4 rounded-xl font-bold text-lg text-white transition-all hover:scale-[1.02]"
          style={{ background: "var(--color-primary)" }}>
          {loading ? "准备中..." : "开始心流 🚀"}
        </button>
      </div>
    );
  }

  // 做题页
  const question = flowState?.question;
  if (!question) return null;

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "var(--color-bg)" }}>
      {/* 边缘闪光 */}
      {flashColor && (
        <div className="fixed inset-0 pointer-events-none transition-opacity duration-300 z-50"
          style={{ boxShadow: `inset 0 0 80px 20px ${flashColor}` }} />
      )}

      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between px-4 py-3" style={{ background: "var(--color-card)", borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>#{totalAnswered + 1}</span>
          <span className="text-sm px-2 py-0.5 rounded" style={{ background: "var(--color-bg)", color: "var(--color-text-secondary)" }}>
            难度 {"⭐".repeat(flowState?.difficulty || 1)}
          </span>
        </div>

        {/* 连击计数器 */}
        <div className="flex items-center gap-2">
          {(flowState?.streak || 0) > 0 && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full font-bold animate-pulse"
              style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)", color: "white" }}>
              🔥 {flowState?.streak}
            </div>
          )}
        </div>

        <button onClick={handleEnd} className="text-sm px-3 py-1 rounded-lg"
          style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
          结束
        </button>
      </div>

      {/* 里程碑特效 */}
      {milestone && (
        <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="text-6xl font-black animate-bounce" style={{ color: "var(--color-primary)" }}>
            🔥 {milestone} 连击！
          </div>
        </div>
      )}

      {/* 题目区域 */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 max-w-2xl mx-auto w-full">
        {question.passage_text && (
          <div className="w-full mb-4 p-4 rounded-xl text-sm leading-relaxed max-h-40 overflow-y-auto"
            style={{ background: "var(--color-card)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>
            {question.passage_text}
          </div>
        )}

        <div className="w-full mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            {enhConfig.auto_tts && <AudioPlayer text={question.content} compact label="听题" />}
          </div>
          <div className="text-lg font-medium leading-relaxed" style={{ color: "var(--color-text)" }}>
            {feedback && !feedback.is_correct && highlights.length > 0 ? (
              <TextHighlighter text={question.content} highlights={highlights} />
            ) : (
              question.content
            )}
          </div>
        </div>

        {/* 答题前审题引导（心流模式下紧凑展示） */}
        {!feedback && !showGuide && !selectedAnswer && (
          <button onClick={() => setShowGuide(true)}
            className="w-full mb-3 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1"
            style={{ background: "rgba(59,130,246,0.06)", color: "#2563eb", border: "1px solid rgba(59,130,246,0.15)" }}>
            🧠 审题引导
          </button>
        )}
        {!feedback && showGuide && (
          <div className="w-full mb-3">
            <PreAnswerGuide
              questionId={question.id}
              questionText={question.content}
              optionsText={question.options.join("\n")}
              source="exam"
              onClose={() => setShowGuide(false)}
              compact
            />
          </div>
        )}

        {/* 选项 */}
        <div className="w-full space-y-3">
          {question.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = selectedAnswer === letter;
            const showResult = selectedAnswer !== null;
            const isCorrect = feedback?.is_correct && isSelected;
            const isWrong = !feedback?.is_correct && isSelected;

            let bg = "var(--color-card)";
            let borderColor = "var(--color-border)";
            if (showResult && isCorrect) { bg = "rgba(34,197,94,0.15)"; borderColor = "#22c55e"; }
            if (showResult && isWrong) { bg = "rgba(239,68,68,0.15)"; borderColor = "#ef4444"; }

            return (
              <button key={i} onClick={() => handleAnswer(letter)} disabled={!!selectedAnswer}
                className="w-full text-left px-5 py-4 rounded-xl text-base transition-all"
                style={{ background: bg, border: `2px solid ${borderColor}`, color: "var(--color-text)" }}>
                <span className="font-bold mr-2">{letter}.</span> {opt}
              </button>
            );
          })}
        </div>

        {/* 认知增强反馈（答错时：渐进式提示） */}
        {feedback && !feedback.is_correct && (
          <div className="w-full mt-4">
            <ProgressiveHintPanel
              data={feedback}
              compact
              onRetry={() => {
                setSelectedAnswer(null);
                setFeedback(null);
                setHighlights([]);
                setFlashColor(null);
                setShowGuide(false);
              }}
              onComplete={() => {
                setSelectedAnswer(null);
                setFeedback(null);
                setHighlights([]);
                setFlashColor(null);
                setMilestone(null);
                setShowGuide(false);
                startTimeRef.current = Date.now();
              }}
            />
          </div>
        )}
      </div>
      <CognitiveEntryButton questionId={question?.id ?? 0} questionText={question?.content ?? ""} source="exam" />
    </div>
  );
}
