"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface ReadingMaterial {
  id: number;
  title: string;
  cefr_level: string;
  grade: string;
  word_count: number;
  content?: string;
  questions_json?: Record<string, unknown> | null;
}

export default function ReadingPage() {
  const [materials, setMaterials] = useState<ReadingMaterial[]>([]);
  const [selected, setSelected] = useState<ReadingMaterial | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ReadingMaterial[]>("/reading/materials")
      .then(setMaterials)
      .catch(() => setMaterials([]))
      .finally(() => setLoading(false));
  }, []);

  const openMaterial = async (id: number) => {
    try {
      const detail = await api.get<ReadingMaterial>(`/reading/${id}`);
      setSelected(detail);
    } catch {
      // ignore
    }
  };

  if (selected) {
    return (
      <div className="max-w-3xl">
        <button
          onClick={() => setSelected(null)}
          className="text-sm text-blue-500 mb-4 hover:underline"
        >
          ← 返回列表
        </button>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {selected.title}
            </h2>
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
              {selected.cefr_level}
            </span>
          </div>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {selected.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">阅读训练</h2>
      {loading ? (
        <div className="text-center text-gray-400 py-12">加载中...</div>
      ) : materials.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400">
          暂无阅读材料，请等待数据导入
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((item) => (
            <div
              key={item.id}
              onClick={() => openMaterial(item.id)}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 cursor-pointer transition-colors"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-800">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.word_count} words
                  </p>
                </div>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                  {item.cefr_level}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
