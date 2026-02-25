"use client";

import { useState } from "react";

export default function WritingPage() {
  const [content, setContent] = useState("");

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
        <button className="bg-blue-500 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors">
          提交批改
        </button>
      </div>
    </div>
  );
}
