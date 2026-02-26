"use client";

import { useEffect, useState } from "react";
import { useExamStore } from "@/stores/exam";
import { useRouter } from "next/navigation";

export default function DiagnosticPage() {
  const router = useRouter();
  const {
    profile, diagnosticSessionId, diagnosticQuestions, diagnosticResult,
    loading, startDiagnostic, submitDiagnostic, fetchDiagnosticResult, generatePlan, fetchProfile,
  } = useExamStore();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ index: number; student_answer: string; time_spent_seconds: number }[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [startTime, setStartTime] = useState(Date.now());
  const [phase, setPhase] = useState<"intro" | "testing" | "result">("intro");

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const examType = profile?.exam_type || "zhongkao";
  const examLabel = examType === "gaokao" ? "高考" : "中考";

  const handleStart = async () => {
    await startDiagnostic(examType);
    setPhase("testing");
    setCurrentIndex(0);
    setAnswers([]);
    setStartTime(Date.now());
  };

  const handleAnswer = () => {
    if (!selectedAnswer) return;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const newAnswers = [...answers, { index: currentIndex, student_answer: selectedAnswer, time_spent_seconds: elapsed }];
    setAnswers(newAnswers);
    setSelectedAnswer("");
    setStartTime(Date.now());

    if (currentIndex + 1 < diagnosticQuestions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 提交
      submitDiagnostic(newAnswers).then(() => setPhase("result"));
    }
  };

  const handleGeneratePlan = async () => {
    if (diagnosticSessionId) {
      await generatePlan(diagnosticSessionId);
      router.push("/exam");
    }
  };

  // Intro
  if (phase === "intro") {
    return (
      <div className="max-w-2xl mx-auto mt-8 space-y-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>AI 入学诊断</h1>
          <p className="text-sm mt-2" style={{ color: "var(--color-text-secondary)" }}>
            40 道精选题覆盖{examLabel}英语所有维度，AI 深度分析你的薄弱环节
          </p>
        </div>

        <div className="p-4 rounded-2xl space-y-3" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <h3 className="font-medium" style={{ color: "var(--color-text)" }}>诊断说明</h3>
          <ul className="text-sm space-y-2" style={{ color: "var(--color-text-secondary)" }}>
            <li>• 共 40 道题，覆盖听力、阅读、完形、语法填空{examType === "gaokao" ? "、短文改错" : ""}、书面表达</li>
            <li>• 难度从易到难递进，请认真作答</li>
            <li>• 完成后 AI 将生成详细分析报告和个性化冲刺计划</li>
            <li>• 预计用时 20-30 分钟</li>
          </ul>
        </div>

        <button onClick={handleStart} disabled={loading}
          className="w-full py-3 rounded-xl text-white font-medium"
          style={{ background: "var(--color-primary)", opacity: loading ? 0.6 : 1 }}>
          {loading ? "生成题目中..." : "开始诊断"}
        </button>
      </div>
    );
  }

  // Testing
  if (phase === "testing" && diagnosticQuestions.length > 0) {
    const q = diagnosticQuestions[currentIndex];
    const progress = ((currentIndex + 1) / diagnosticQuestions.length) * 100;

    return (
      <div className="max-w-2xl mx-auto mt-4 space-y-4">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: "var(--color-primary)" }} />
          </div>
          <span className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>
            {currentIndex + 1}/{diagnosticQuestions.length}
          </span>
        </div>

        {/* Question */}
        <div className="p-5 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
              {q.section}
            </span>
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              难度 {"★".repeat(q.difficulty)}{"☆".repeat(5 - q.difficulty)}
            </span>
          </div>

          <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
            {q.question}
          </p>

          {q.options.length > 0 ? (
            <div className="mt-4 space-y-2">
              {q.options.map((opt, i) => (
                <button key={i} onClick={() => setSelectedAnswer(opt.charAt(0))}
                  className="w-full text-left px-4 py-3 rounded-xl transition-all text-sm"
                  style={{
                    background: selectedAnswer === opt.charAt(0) ? "var(--color-primary-light)" : "var(--color-bg)",
                    border: `2px solid ${selectedAnswer === opt.charAt(0) ? "var(--color-primary)" : "var(--color-border)"}`,
                    color: "var(--color-text)",
                  }}>
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={selectedAnswer} onChange={e => setSelectedAnswer(e.target.value)}
              placeholder="请输入你的答案..."
              className="w-full mt-4 px-4 py-3 rounded-xl text-sm resize-none"
              style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)", minHeight: 100 }}
            />
          )}
        </div>

        <button onClick={handleAnswer} disabled={!selectedAnswer}
          className="w-full py-3 rounded-xl text-white font-medium transition-opacity"
          style={{ background: "var(--color-primary)", opacity: selectedAnswer ? 1 : 0.5 }}>
          {currentIndex + 1 < diagnosticQuestions.length ? "下一题" : "提交诊断"}
        </button>
      </div>
    );
  }

  // Result
  if (phase === "result" && diagnosticResult) {
    const result = diagnosticResult as {
      total_score: number; max_score: number;
      section_scores: Record<string, { correct: number; total: number }>;
      weak_points: { section: string; label: string; rate: number }[];
      strong_points: { section: string; label: string; rate: number }[];
      ai_analysis: Record<string, unknown> | null;
    };

    return (
      <div className="max-w-2xl mx-auto mt-4 space-y-4">
        {/* Score reveal */}
        <div className="text-center p-6 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>诊断得分</p>
          <p className="text-5xl font-bold mt-2" style={{ color: "var(--color-primary)" }}>
            {result.total_score}<span className="text-lg font-normal" style={{ color: "var(--color-text-secondary)" }}>/{result.max_score}</span>
          </p>
        </div>

        {/* Section scores */}
        <div className="p-4 rounded-2xl space-y-3" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <h3 className="font-medium" style={{ color: "var(--color-text)" }}>各题型得分</h3>
          {Object.entries(result.section_scores || {}).map(([sec, data]) => {
            const rate = data.total > 0 ? data.correct / data.total : 0;
            return (
              <div key={sec} className="flex items-center gap-3">
                <span className="text-sm w-20" style={{ color: "var(--color-text)" }}>{sec}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                  <div className="h-full rounded-full" style={{ width: `${rate * 100}%`, background: rate >= 0.8 ? "#22c55e" : rate >= 0.6 ? "#f59e0b" : "#ef4444" }} />
                </div>
                <span className="text-sm w-16 text-right" style={{ color: "var(--color-text-secondary)" }}>{data.correct}/{data.total}</span>
              </div>
            );
          })}
        </div>

        {/* Weak & Strong */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
            <h3 className="text-sm font-medium mb-2" style={{ color: "#ef4444" }}>⚠ 薄弱环节</h3>
            {(result.weak_points || []).map((w, i) => (
              <p key={i} className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{w.label} ({(w.rate * 100).toFixed(0)}%)</p>
            ))}
            {(!result.weak_points || result.weak_points.length === 0) && (
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>无明显薄弱环节</p>
            )}
          </div>
          <div className="p-4 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
            <h3 className="text-sm font-medium mb-2" style={{ color: "#22c55e" }}>✓ 优势领域</h3>
            {(result.strong_points || []).map((s, i) => (
              <p key={i} className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{s.label} ({(s.rate * 100).toFixed(0)}%)</p>
            ))}
          </div>
        </div>

        {/* AI Analysis */}
        {result.ai_analysis && (
          <div className="p-4 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
            <h3 className="font-medium mb-2" style={{ color: "var(--color-text)" }}>🤖 AI 深度分析</h3>
            <pre className="text-sm whitespace-pre-wrap" style={{ color: "var(--color-text-secondary)" }}>
              {typeof result.ai_analysis === "string" ? result.ai_analysis : JSON.stringify(result.ai_analysis, null, 2)}
            </pre>
          </div>
        )}

        <button onClick={handleGeneratePlan} disabled={loading}
          className="w-full py-3 rounded-xl text-white font-medium"
          style={{ background: "var(--color-primary)", opacity: loading ? 0.6 : 1 }}>
          {loading ? "生成中..." : "生成冲刺计划"}
        </button>
      </div>
    );
  }

  // Loading fallback
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 rounded-full" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
    </div>
  );
}
