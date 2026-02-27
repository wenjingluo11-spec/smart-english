"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface Annotation {
  id: number;
  annotator_id: number;
  question_id: number;
  gaze_path_json: string | null;
  narration: string | null;
  notes: string | null;
  quality_score: number | null;
  created_at: string;
}

interface KnowledgeEntry {
  id: number;
  question_type: string;
  topic: string;
  difficulty: number;
  best_strategy: Record<string, unknown>;
  common_errors: { pattern: string; frequency: string; fix: string }[];
  effective_clues: { type: string; effectiveness: string; example: string }[];
  human_annotation_count: number;
  ai_analysis_count: number;
  user_behavior_count: number;
  avg_success_rate: number;
  updated_at: string;
}

/**
 * V4.3 标注管理 + V4.4 知识库管理后台页面。
 */
export default function AnnotationsPage() {
  const [tab, setTab] = useState<"annotations" | "knowledge" | "distill">("annotations");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // Annotation filters
  const [filterQid, setFilterQid] = useState("");

  // Distill form
  const [distillForm, setDistillForm] = useState({ question_type: "单项选择", topic: "", difficulty: "3" });
  const [distillResult, setDistillResult] = useState<Record<string, unknown> | null>(null);

  const fetchAnnotations = useCallback(async () => {
    setLoading(true);
    try {
      const qid = filterQid.trim();
      const url = qid ? `/cognitive/annotations/${qid}` : `/cognitive/annotations/0`;
      const data = await api.get<Annotation[]>(url);
      setAnnotations(Array.isArray(data) ? data : [data].filter(Boolean));
    } catch { setAnnotations([]); }
    setLoading(false);
  }, [filterQid]);

  const fetchKnowledge = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<KnowledgeEntry[]>("/behavior/knowledge-base");
      setKnowledge(data);
    } catch { setKnowledge([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "annotations" && filterQid) fetchAnnotations();
    if (tab === "knowledge") fetchKnowledge();
  }, [tab]);

  const handleScore = async (id: number, score: number) => {
    try {
      await api.put(`/cognitive/annotations/${id}/score`, { quality_score: score });
      setMsg(`标注 #${id} 评分已更新为 ${score}`);
      fetchAnnotations();
    } catch { setMsg("评分失败"); }
  };

  const handleDistill = async () => {
    setLoading(true);
    setDistillResult(null);
    try {
      const res = await api.post<Record<string, unknown>>("/behavior/distill", {
        question_type: distillForm.question_type,
        topic: distillForm.topic,
        difficulty: parseInt(distillForm.difficulty),
      });
      setDistillResult(res);
      setMsg("蒸馏完成");
    } catch { setMsg("蒸馏失败"); }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4" style={{ color: "var(--color-text)" }}>
        认知增强管理后台
      </h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: "var(--color-surface-hover)" }}>
        {([
          { key: "annotations" as const, label: "人工标注管理" },
          { key: "knowledge" as const, label: "知识库" },
          { key: "distill" as const, label: "蒸馏系统" },
        ]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.key ? "var(--color-surface)" : "transparent",
              color: tab === t.key ? "var(--color-text)" : "var(--color-text-secondary)",
              boxShadow: tab === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {msg && (
        <div className="mb-3 p-2 rounded-lg text-xs" style={{ background: "rgba(34,197,94,0.1)", color: "#16a34a" }}>
          {msg}
          <button onClick={() => setMsg("")} className="ml-2 underline">关闭</button>
        </div>
      )}

      {/* Annotations Tab */}
      {tab === "annotations" && (
        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs block mb-1" style={{ color: "var(--color-text-secondary)" }}>题目 ID</label>
              <input type="text" value={filterQid} onChange={(e) => setFilterQid(e.target.value)}
                placeholder="输入题目ID查询标注"
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }} />
            </div>
            <button onClick={fetchAnnotations} disabled={!filterQid.trim()}
              className="px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50"
              style={{ background: "var(--color-primary)" }}>
              查询
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-sm" style={{ color: "var(--color-text-secondary)" }}>加载中...</div>
          ) : annotations.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {filterQid ? "该题目暂无标注数据" : "请输入题目ID查询"}
            </div>
          ) : (
            <div className="space-y-3">
              {annotations.map((a) => (
                <div key={a.id} className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--color-primary)", color: "#fff" }}>
                        #{a.id}
                      </span>
                      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        标注者 #{a.annotator_id} · 题目 #{a.question_id}
                      </span>
                      <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                        {a.created_at?.slice(0, 10)}
                      </span>
                    </div>
                    {/* Quality score buttons */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs mr-1" style={{ color: "var(--color-text-secondary)" }}>质量：</span>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} onClick={() => handleScore(a.id, s)}
                          className="w-6 h-6 rounded-full text-xs transition-all"
                          style={{
                            background: a.quality_score && s <= a.quality_score ? "#f59e0b" : "var(--color-border)",
                            color: a.quality_score && s <= a.quality_score ? "#fff" : "var(--color-text-secondary)",
                          }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  {a.narration && (
                    <p className="text-sm mb-1" style={{ color: "var(--color-text)" }}>{a.narration}</p>
                  )}
                  {a.notes && (
                    <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>备注：{a.notes}</p>
                  )}
                  {a.gaze_path_json && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer" style={{ color: "var(--color-primary)" }}>查看审题轨迹数据</summary>
                      <pre className="text-xs mt-1 p-2 rounded-lg overflow-auto max-h-40"
                        style={{ background: "var(--color-surface-hover)", color: "var(--color-text-secondary)" }}>
                        {JSON.stringify(JSON.parse(a.gaze_path_json), null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Knowledge Base Tab */}
      {tab === "knowledge" && (
        <div className="space-y-3">
          <button onClick={fetchKnowledge} className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: "var(--color-primary)", color: "#fff" }}>
            刷新
          </button>
          {knowledge.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              知识库为空，请先运行蒸馏
            </div>
          ) : (
            knowledge.map((k) => (
              <div key={k.id} className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: "var(--color-primary)" }}>
                    {k.question_type}
                  </span>
                  {k.topic && <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{k.topic}</span>}
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>难度 {k.difficulty}</span>
                  <span className="text-xs ml-auto" style={{ color: "var(--color-text-secondary)" }}>
                    人工{k.human_annotation_count} · AI{k.ai_analysis_count} · 行为{k.user_behavior_count}
                  </span>
                </div>
                {k.best_strategy && typeof k.best_strategy === "object" && "name" in k.best_strategy && (
                  <div className="p-2 rounded-lg mb-2" style={{ background: "rgba(34,197,94,0.06)" }}>
                    <span className="text-xs font-medium" style={{ color: "#16a34a" }}>最佳策略：{String(k.best_strategy.name || "")}</span>
                    <p className="text-xs mt-0.5" style={{ color: "var(--color-text)" }}>{String(k.best_strategy.description || "")}</p>
                  </div>
                )}
                {k.common_errors.length > 0 && (
                  <div className="text-xs space-y-0.5">
                    <span style={{ color: "#d97706" }}>常见错误：</span>
                    {k.common_errors.slice(0, 3).map((e, i) => (
                      <div key={i} style={{ color: "var(--color-text-secondary)" }}>• {e.pattern} → {e.fix}</div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Distill Tab */}
      {tab === "distill" && (
        <div className="space-y-4">
          <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>运行知识蒸馏</h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--color-text-secondary)" }}>题型</label>
                <select value={distillForm.question_type}
                  onChange={(e) => setDistillForm({ ...distillForm, question_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                  {["单项选择", "完形填空", "阅读理解", "语法填空", "短文改错"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--color-text-secondary)" }}>知识点（可选）</label>
                <input type="text" value={distillForm.topic}
                  onChange={(e) => setDistillForm({ ...distillForm, topic: e.target.value })}
                  placeholder="如：时态"
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }} />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--color-text-secondary)" }}>难度</label>
                <select value={distillForm.difficulty}
                  onChange={(e) => setDistillForm({ ...distillForm, difficulty: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <button onClick={handleDistill} disabled={loading}
              className="px-5 py-2 rounded-lg text-sm text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}>
              {loading ? "蒸馏中..." : "开始蒸馏"}
            </button>
          </div>

          {distillResult && (
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
              <h4 className="text-sm font-medium mb-2" style={{ color: "var(--color-text)" }}>蒸馏结果</h4>
              <pre className="text-xs p-3 rounded-lg overflow-auto max-h-80"
                style={{ background: "var(--color-surface-hover)", color: "var(--color-text)" }}>
                {JSON.stringify(distillResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
