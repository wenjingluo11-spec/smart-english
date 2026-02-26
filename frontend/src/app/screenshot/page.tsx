"use client";

import { useCallback, useState } from "react";
import UploadZone from "@/components/screenshot/upload-zone";
import AnalysisResult from "@/components/screenshot/analysis-result";
import ExerciseCard from "@/components/screenshot/exercise-card";
import { api } from "@/lib/api";

interface Analysis {
  id: number;
  image_url: string;
  source_type: string;
  extracted_text: string | null;
  analysis: {
    vocabulary?: { word: string; pos: string; meaning: string; example: string }[];
    grammar_points?: { point: string; explanation: string; example: string }[];
    cultural_notes?: { note: string }[];
    exercises?: { type: string; question: string; options?: string[]; answer: string; explanation: string }[];
  } | null;
  created_at: string;
  xp?: Record<string, unknown>;
}

interface HistoryItem {
  id: number;
  image_url: string;
  source_type: string;
  extracted_text: string | null;
  analysis: Analysis["analysis"];
  created_at: string;
}

export default function ScreenshotPage() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleUpload = useCallback(async (file: File, sourceType: string) => {
    setLoading(true);
    try {
      const result = await api.upload<Analysis>("/screenshot/analyze", file, { source_type: sourceType });
      setAnalysis(result);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "分析失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await api.get<HistoryItem[]>("/screenshot/history");
      setHistory(data);
      setShowHistory(true);
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>📸 截图学英语</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            上传游戏、社交媒体、网页截图，AI 帮你提取词汇和语法
          </p>
        </div>
        <button
          onClick={loadHistory}
          className="px-4 py-2 rounded-lg text-sm"
          style={{ background: "var(--color-card)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
        >
          历史记录
        </button>
      </div>

      <UploadZone onUpload={handleUpload} loading={loading} />

      {analysis?.analysis && (
        <>
          <AnalysisResult analysis={analysis.analysis} imageUrl={analysis.image_url} />
          {analysis.analysis.exercises && analysis.analysis.exercises.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>练习题</h2>
              {analysis.analysis.exercises.map((ex, i) => (
                <ExerciseCard key={i} exercise={ex} lessonId={analysis.id} exerciseIndex={i} />
              ))}
            </div>
          )}
          {analysis.xp && (
            <div className="text-center text-sm" style={{ color: "var(--color-primary)" }}>
              +{String((analysis.xp as Record<string, number>).xp_gained ?? 0)} XP
            </div>
          )}
        </>
      )}

      {showHistory && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>学习历史</h2>
          {history.length === 0 && <p style={{ color: "var(--color-text-secondary)" }}>暂无记录</p>}
          {history.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl cursor-pointer"
              style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
              onClick={() => setAnalysis({ ...item, xp: undefined })}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-1 rounded" style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
                  {item.source_type}
                </span>
                <span className="text-sm" style={{ color: "var(--color-text)" }}>
                  {item.extracted_text?.slice(0, 60) || "截图分析"}
                </span>
                <span className="ml-auto text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
