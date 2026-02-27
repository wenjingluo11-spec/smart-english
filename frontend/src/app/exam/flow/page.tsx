"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useExamStore } from "@/stores/exam";
import { useRouter } from "next/navigation";
import { tracker } from "@/lib/behavior-tracker";
import { useEnhancementConfig } from "@/hooks/use-enhancement-config";
import AudioPlayer from "@/components/cognitive/AudioPlayer";
import ExpertDemo from "@/components/cognitive/ExpertDemo";
import CognitiveFeedback from "@/components/cognitive/CognitiveFeedback";

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
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    explanation: string;
    milestone: number | null;
    how_to_spot?: string;
    key_clues?: { text: string; role: string }[];
    common_trap?: string;
    method?: string;
    analysis?: {
      key_phrases: { text: string; role: string; importance: string; hint: string }[];
      reading_order: { step: number; target: string; action: string; reason: string }[];
      strategy: string;
      distractors: { option: string; trap: string }[];
    };
  } | null>(null);
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

  const handleAnswer = useCallback(async (answer: string) => {
    if (!flowState?.question || selectedAnswer) return;
    setSelectedAnswer(answer);
    const responseMs = Date.now() - startTimeRef.current;

    const res = await submitFlowAnswer(flowState.question.id, answer, responseMs);

    const isCorrect = res.is_correct as boolean;
    setFlashColor(isCorrect ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)");
    tracker.track("answer_submit", { question_id: flowState.question.id, module: "exam" }, { event_data: { answer, is_correct: isCorrect, response_ms: responseMs } });
    setFeedback({
      correct: isCorrect,
      explanation: (res.explanation as string) || "",
      milestone: (res.milestone as number) || null,
      how_to_spot: (res.how_to_spot as string) || "",
      key_clues: (res.key_clues as { text: string; role: string }[]) || [],
      common_trap: (res.common_trap as string) || "",
      method: (res.method as string) || "",
      analysis: res.analysis as typeof feedback extends null ? never : NonNullable<typeof feedback>["analysis"],
    });
    setTotalAnswered((n) => n + 1);

    // 自动切下一题：答对快切，答错需要手动点击（留时间看学霸演示）
    if (isCorrect) {
      setTimeout(() => {
        setSelectedAnswer(null);
        setFeedback(null);
        setFlashColor(null);
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
      {feedback?.milestone && (
        <div className="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="text-6xl font-black animate-bounce" style={{ color: "var(--color-primary)" }}>
            🔥 {feedback.milestone} 连击！
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
          <p className="text-lg font-medium leading-relaxed" style={{ color: "var(--color-text)" }}>
            {question.content}
          </p>
        </div>

        {/* 选项 */}
        <div className="w-full space-y-3">
          {question.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = selectedAnswer === letter;
            const showResult = selectedAnswer !== null;
            const isCorrect = feedback?.correct && isSelected;
            const isWrong = !feedback?.correct && isSelected;

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

        {/* 认知增强反馈（答错时显示） */}
        {feedback && !feedback.correct && (
          <div className="w-full mt-4 space-y-2">
            {/* 学霸审题演示 */}
            {enhConfig.show_expert_demo && (
              <ExpertDemo
                questionText={question.content}
                questionId={question.id}
                source="exam"
              />
            )}
            {/* 统一认知反馈 */}
            <CognitiveFeedback
              data={{
                how_to_spot: feedback.how_to_spot,
                key_clues: feedback.key_clues,
                common_trap: feedback.common_trap,
                method: feedback.method,
              }}
              compact
            />
            {/* 兜底：如果没有认知增强字段，显示传统解析 */}
            {!feedback.how_to_spot && !feedback.common_trap && !feedback.method && feedback.explanation && (
              <div className="p-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                {feedback.explanation}
              </div>
            )}
            {/* 手动下一题按钮 */}
            <button
              onClick={() => {
                setSelectedAnswer(null);
                setFeedback(null);
                setFlashColor(null);
                startTimeRef.current = Date.now();
              }}
              className="w-full py-3 rounded-xl font-medium text-white mt-2"
              style={{ background: "var(--color-primary)" }}
            >
              我看懂了，下一题
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
