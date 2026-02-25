"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface WritingFeedback {
  id: number;
  score: number | null;
  feedback_json: {
    summary?: string;
    strengths?: string[];
    improvements?: string[];
    corrected_sentences?: { original: string; corrected: string; reason: string }[];
  } | null;
  created_at: string;
}

export default function WritingPage() {
  const [prompt, setPrompt] = useState("");
  const [content, setContent] = useState("");
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError("");
    setFeedback(null);
    try {
      const res = await api.post<WritingFeedback>("/writing/submit", {
        prompt: prompt || "Free writing",
        content,
      });
      setFeedback(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">写作批改</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            写作题目
          </label>
          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
            placeholder="例如：My Favorite Season"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            作文内容
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm h-48 resize-none focus:outline-none focus:border-blue-400"
            placeholder="在这里写你的作文..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="text-xs text-gray-400 mt-1 text-right">
            {content.split(/\s+/).filter(Boolean).length} words
          </div>
        </div>
        {error && (
          <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading || !content.trim()}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {loading ? "批改中..." : "提交批改"}
        </button>

        {feedback && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-500">
              提交成功（ID: {feedback.id}）
              {feedback.score !== null && (
                <span className="ml-2 text-blue-600 font-medium">
                  得分：{feedback.score}/100
                </span>
              )}
            </div>
            {feedback.feedback_json?.summary && (
              <div className="mt-2 text-sm text-gray-700">
                {feedback.feedback_json.summary}
              </div>
            )}
            {!feedback.score && (
              <div className="mt-2 text-xs text-gray-400">
                AI 批改结果将在后续版本中实时返回
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
