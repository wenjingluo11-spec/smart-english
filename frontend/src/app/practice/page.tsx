"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface Question {
  id: number;
  topic: string;
  difficulty: number;
  question_type: string;
  content: string;
  options_json: Record<string, string> | null;
}

interface SubmitResult {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
}

export default function PracticePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [questionType, setQuestionType] = useState("");
  const [difficulty, setDifficulty] = useState("");

  const fetchQuestions = async () => {
    setLoading(true);
    setResult(null);
    setCurrent(0);
    setSelected("");
    try {
      const params = new URLSearchParams();
      if (questionType) params.set("question_type", questionType);
      if (difficulty) params.set("difficulty", difficulty);
      params.set("limit", "10");
      const data = await api.get<Question[]>(
        `/practice/questions?${params.toString()}`
      );
      setQuestions(data);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selected) return;
    const q = questions[current];
    try {
      const res = await api.post<SubmitResult>("/practice/submit", {
        question_id: q.id,
        answer: selected,
        time_spent: 0,
      });
      setResult(res);
    } catch {
      // ignore
    }
  };

  const handleNext = () => {
    setResult(null);
    setSelected("");
    setCurrent((prev) => prev + 1);
  };

  const q = questions[current];

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">智能题库</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex gap-3 mb-6">
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={questionType}
            onChange={(e) => setQuestionType(e.target.value)}
          >
            <option value="">全部题型</option>
            <option value="单选">单项选择</option>
            <option value="完形填空">完形填空</option>
            <option value="阅读理解">阅读理解</option>
          </select>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="">全部难度</option>
            <option value="1">简单</option>
            <option value="3">中等</option>
            <option value="5">困难</option>
          </select>
          <button
            onClick={fetchQuestions}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
          >
            开始练习
          </button>
        </div>

        {loading && <div className="text-center text-gray-400 py-12">加载中...</div>}

        {!loading && !q && (
          <div className="text-center text-gray-400 py-12">
            {questions.length === 0 && current === 0
              ? "选择题型和难度后开始练习"
              : "已完成全部题目！"}
          </div>
        )}

        {!loading && q && (
          <div>
            <div className="text-xs text-gray-400 mb-2">
              第 {current + 1}/{questions.length} 题 · {q.question_type} · 难度{" "}
              {q.difficulty}
            </div>
            <div className="text-sm text-gray-800 mb-4 whitespace-pre-wrap">
              {q.content}
            </div>
            {q.options_json && (
              <div className="space-y-2 mb-4">
                {Object.entries(q.options_json).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => !result && setSelected(key)}
                    className={`w-full text-left px-4 py-2 rounded-lg border text-sm transition-colors ${
                      selected === key
                        ? result
                          ? result.correct_answer === key
                            ? "border-green-400 bg-green-50"
                            : "border-red-400 bg-red-50"
                          : "border-blue-400 bg-blue-50"
                        : result && result.correct_answer === key
                        ? "border-green-400 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {key}. {val}
                  </button>
                ))}
              </div>
            )}
            {!q.options_json && !result && (
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm mb-4 focus:outline-none focus:border-blue-400"
                placeholder="输入你的答案"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
              />
            )}
            {result ? (
              <div className="space-y-3">
                <div
                  className={`text-sm font-medium ${
                    result.is_correct ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {result.is_correct ? "回答正确！" : "回答错误"}
                  {!result.is_correct && (
                    <span className="text-gray-500 ml-2">
                      正确答案：{result.correct_answer}
                    </span>
                  )}
                </div>
                {result.explanation && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    {result.explanation}
                  </div>
                )}
                {current < questions.length - 1 && (
                  <button
                    onClick={handleNext}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
                  >
                    下一题
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!selected}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                提交答案
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
