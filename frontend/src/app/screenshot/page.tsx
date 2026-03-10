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
    self_extract?: string;
    delta_reflection?: string;
    transfer_sentence?: string;
    missing_from_self?: string[];
    self_extract_coverage?: number;
    suggested_delta_reflection?: string;
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
  const [selfExtract, setSelfExtract] = useState("");
  const [deltaReflection, setDeltaReflection] = useState("");
  const [transferSentence, setTransferSentence] = useState("");
  const [savingReflection, setSavingReflection] = useState(false);
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleUpload = useCallback(async (file: File, sourceType: string) => {
    const trimmedSelfExtract = selfExtract.trim();
    if (!trimmedSelfExtract) {
      alert("请先填写你自己提取的关键词，再开始分析。");
      return;
    }
    setLoading(true);
    try {
      const result = await api.upload<Analysis>("/screenshot/analyze", file, {
        source_type: sourceType,
        self_extract: trimmedSelfExtract,
      });
      setAnalysis(result);
      setDeltaReflection(result.analysis?.delta_reflection || result.analysis?.suggested_delta_reflection || "");
      setTransferSentence(result.analysis?.transfer_sentence || "");
      setReflectionSaved(Boolean(result.analysis?.delta_reflection || result.analysis?.transfer_sentence));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "分析失败");
    } finally {
      setLoading(false);
    }
  }, [selfExtract]);

  const loadHistory = useCallback(async () => {
    try {
      const data = await api.get<HistoryItem[]>("/screenshot/history");
      setHistory(data);
      setShowHistory(true);
    } catch { /* ignore */ }
  }, []);

  const saveReflection = useCallback(async () => {
    if (!analysis) return;
    if (!deltaReflection.trim() || !transferSentence.trim()) {
      alert("请填写差异反思和迁移句。");
      return;
    }
    setSavingReflection(true);
    try {
      await api.post("/screenshot/reflection", {
        lesson_id: analysis.id,
        delta_reflection: deltaReflection.trim(),
        transfer_sentence: transferSentence.trim(),
      });
      setReflectionSaved(true);
      setAnalysis((prev) => {
        if (!prev?.analysis) return prev;
        return {
          ...prev,
          analysis: {
            ...prev.analysis,
            delta_reflection: deltaReflection.trim(),
            transfer_sentence: transferSentence.trim(),
          },
        };
      });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSavingReflection(false);
    }
  }, [analysis, deltaReflection, transferSentence]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>📸 截图学英语</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            先写你的关键词提取，再上传截图对照 AI 结果
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

      <div className="rounded-xl p-4 space-y-2" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Step 1：先手动提取关键词</p>
        <textarea
          value={selfExtract}
          onChange={(e) => setSelfExtract(e.target.value)}
          placeholder="先不看 AI，写下你在截图里识别到的关键词（逗号或空格分隔）"
          rows={3}
          className="w-full rounded-lg p-3 text-sm"
          style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
        />
      </div>

      <UploadZone onUpload={handleUpload} loading={loading} />

      {analysis?.analysis && (
        <>
          <AnalysisResult analysis={analysis.analysis} imageUrl={analysis.image_url} />
          <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
            <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>Step 2：差异反思与迁移</p>
            <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              覆盖率：{Math.round((analysis.analysis.self_extract_coverage || 0) * 100)}%
            </div>
            {analysis.analysis.missing_from_self && analysis.analysis.missing_from_self.length > 0 && (
              <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                你可能漏掉：{analysis.analysis.missing_from_self.join(", ")}
              </div>
            )}
            <textarea
              value={deltaReflection}
              onChange={(e) => {
                setDeltaReflection(e.target.value);
                setReflectionSaved(false);
              }}
              rows={3}
              placeholder={analysis.analysis.suggested_delta_reflection || "写下：你漏掉了什么，为什么会漏，下次如何改进"}
              className="w-full rounded-lg p-3 text-sm"
              style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
            />
            <textarea
              value={transferSentence}
              onChange={(e) => {
                setTransferSentence(e.target.value);
                setReflectionSaved(false);
              }}
              rows={2}
              placeholder="迁移句：用本次学到的词汇写一句和你真实场景相关的英文句子"
              className="w-full rounded-lg p-3 text-sm"
              style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
            />
            <button
              onClick={saveReflection}
              disabled={savingReflection}
              className="px-4 py-2 rounded-lg text-sm text-white"
              style={{ background: "var(--color-primary)", opacity: savingReflection ? 0.6 : 1 }}
            >
              {savingReflection ? "保存中..." : "保存反思与迁移句"}
            </button>
            {reflectionSaved && (
              <p className="text-xs" style={{ color: "#166534" }}>已保存，可开始做练习题。</p>
            )}
          </div>
          {analysis.analysis.exercises && analysis.analysis.exercises.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>练习题</h2>
              {analysis.analysis.exercises.map((ex, i) => (
                <ExerciseCard
                  key={i}
                  exercise={ex}
                  lessonId={analysis.id}
                  exerciseIndex={i}
                  transferSentence={transferSentence}
                />
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
              onClick={() => {
                setAnalysis({ ...item, xp: undefined });
                setSelfExtract(item.analysis?.self_extract || "");
                setDeltaReflection(item.analysis?.delta_reflection || item.analysis?.suggested_delta_reflection || "");
                setTransferSentence(item.analysis?.transfer_sentence || "");
                setReflectionSaved(Boolean(item.analysis?.delta_reflection || item.analysis?.transfer_sentence));
              }}
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
