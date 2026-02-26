"use client";

import { useState } from "react";
import { useExamStore } from "@/stores/exam";

const QUICK_TAGS = [
  { label: "阅读理解", prompt: "阅读理解" },
  { label: "完形填空", prompt: "完形填空" },
  { label: "语法填空", prompt: "语法填空" },
  { label: "短文改错", prompt: "短文改错" },
];

const TOPIC_TAGS = [
  "环保", "科技", "校园生活", "太空探索", "传统文化", "健康饮食", "社交媒体", "旅行",
];

export default function CustomQuizPage() {
  const { currentCustomQuiz, loading, generateCustomQuiz, submitCustomQuiz } = useExamStore();
  const [prompt, setPrompt] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{ score: number; total: number; accuracy: number; feedback: { index: number; is_correct: boolean; correct_answer: string; explanation: string }[] } | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setResult(null);
    setAnswers({});
    await generateCustomQuiz(prompt);
  };

  const handleSubmit = async () => {
    const answerList = Object.entries(answers).map(([idx, ans]) => ({ index: Number(idx), answer: ans }));
    const res = await submitCustomQuiz(answerList);
    setResult(res as typeof result);
  };

  const addTag = (tag: string) => {
    setPrompt((p) => (p ? `${p}，${tag}` : tag));
  };

  // 结果页
  if (result) {
    return (
      <div className="max-w-2xl mx-auto mt-8 space-y-6">
        <div className="p-6 rounded-2xl text-center" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text)" }}>📊 批改结果</h1>
          <div className="text-4xl font-black my-4" style={{ color: "var(--color-primary)" }}>
            {result.score}/{result.total}
          </div>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>正确率 {result.accuracy}%</p>
        </div>

        <div className="space-y-3">
          {result.feedback?.map((fb, i) => (
            <div key={i} className="p-4 rounded-xl" style={{
              background: fb.is_correct ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${fb.is_correct ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            }}>
              <div className="flex items-center gap-2 mb-1">
                <span>{fb.is_correct ? "✓" : "✗"}</span>
                <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>第 {i + 1} 题</span>
                {!fb.is_correct && <span className="text-xs" style={{ color: "#ef4444" }}>正确答案：{fb.correct_answer}</span>}
              </div>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{fb.explanation}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => { setResult(null); setAnswers({}); setPrompt(""); }}
            className="flex-1 py-3 rounded-xl font-medium" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>
            换个题目
          </button>
          <button onClick={() => { setResult(null); setAnswers({}); }}
            className="flex-1 py-3 rounded-xl font-medium text-white" style={{ background: "var(--color-primary)" }}>
            再来一组类似的
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>🤖 AI 出题官</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>告诉 AI 你想练什么，实时生成对标真题</p>
      </div>

      {/* 输入区 */}
      {!currentCustomQuiz && (
        <div className="p-6 rounded-2xl space-y-4" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}
            placeholder="例如：出 5 道关于环保话题的完形填空，难度中等"
            rows={3} className="w-full px-4 py-3 rounded-xl text-sm resize-none"
            style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }} />

          <div>
            <p className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>题型</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_TAGS.map((t) => (
                <button key={t.label} onClick={() => addTag(t.prompt)}
                  className="px-3 py-1 rounded-full text-xs" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>话题</p>
            <div className="flex flex-wrap gap-2">
              {TOPIC_TAGS.map((t) => (
                <button key={t} onClick={() => addTag(t)}
                  className="px-3 py-1 rounded-full text-xs" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate} disabled={loading || !prompt.trim()}
            className="w-full py-3 rounded-xl font-medium text-white" style={{ background: "var(--color-primary)", opacity: loading || !prompt.trim() ? 0.5 : 1 }}>
            {loading ? "AI 出题中..." : "生成题目"}
          </button>
        </div>
      )}

      {/* 做题区 */}
      {currentCustomQuiz && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {currentCustomQuiz.section_label} · 难度 {"⭐".repeat(currentCustomQuiz.difficulty)}
            </span>
            <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              共 {currentCustomQuiz.total} 题
            </span>
          </div>

          {currentCustomQuiz.questions.map((q, qi) => (
            <div key={qi} className="p-4 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
              <p className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>
                {qi + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const letter = String.fromCharCode(65 + oi);
                  const selected = answers[qi] === letter;
                  return (
                    <button key={oi} onClick={() => setAnswers({ ...answers, [qi]: letter })}
                      className="w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all"
                      style={{
                        background: selected ? "var(--color-primary)" : "var(--color-bg)",
                        color: selected ? "white" : "var(--color-text)",
                        border: `1px solid ${selected ? "var(--color-primary)" : "var(--color-border)"}`,
                      }}>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <button onClick={handleSubmit}
            disabled={Object.keys(answers).length < currentCustomQuiz.total}
            className="w-full py-3 rounded-xl font-medium text-white"
            style={{ background: "var(--color-primary)", opacity: Object.keys(answers).length < currentCustomQuiz.total ? 0.5 : 1 }}>
            提交批改
          </button>
        </div>
      )}
    </div>
  );
}
