"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface VocabWord {
  id: number;
  word: string;
  definition: string;
  status: string;
  next_review_at: string | null;
}

export default function VocabularyPage() {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [newWord, setNewWord] = useState("");
  const [newDef, setNewDef] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchWords = () => {
    api
      .get<VocabWord[]>("/vocabulary/")
      .then(setWords)
      .catch(() => setWords([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWords();
  }, []);

  const handleAdd = async () => {
    if (!newWord.trim()) return;
    try {
      await api.post("/vocabulary/add", {
        word: newWord.trim(),
        definition: newDef.trim(),
      });
      setNewWord("");
      setNewDef("");
      setShowAdd(false);
      fetchWords();
    } catch {
      // ignore
    }
  };

  const statusLabel: Record<string, string> = {
    new: "新词",
    learning: "学习中",
    mastered: "已掌握",
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">词汇系统</h2>
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
        >
          添加生词
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">单词</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="apple"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">释义</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              value={newDef}
              onChange={(e) => setNewDef(e.target.value)}
              placeholder="苹果"
            />
          </div>
          <button
            onClick={handleAdd}
            className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors"
          >
            保存
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">加载中...</div>
      ) : words.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400">
          生词本为空，点击上方按钮添加生词
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {words.map((w) => (
            <div key={w.id} className="px-4 py-3 flex justify-between items-center">
              <div>
                <span className="font-medium text-gray-800">{w.word}</span>
                {w.definition && (
                  <span className="text-sm text-gray-500 ml-3">{w.definition}</span>
                )}
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  w.status === "mastered"
                    ? "bg-green-50 text-green-600"
                    : w.status === "learning"
                    ? "bg-yellow-50 text-yellow-600"
                    : "bg-gray-50 text-gray-500"
                }`}
              >
                {statusLabel[w.status] || w.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
