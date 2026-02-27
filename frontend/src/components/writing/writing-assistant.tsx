"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import AudioPlayer from "@/components/cognitive/AudioPlayer";
import SyncReader from "@/components/cognitive/SyncReader";

interface Hint {
  type: string;
  target_text: string;
  hint: string;
  direction: string;
}

interface RealtimeHintResult {
  sentence_quality: "good" | "ok" | "weak";
  hints: Hint[];
  sentence_pattern_suggestion: string;
  encouragement: string;
}

interface ParagraphReviewResult {
  coherence_score: number;
  has_topic_sentence: boolean;
  flow_issues: string[];
  expression_highlights: { text: string; praise: string }[];
  improvement_directions: { aspect: string; hint: string }[];
  next_paragraph_hint: string;
}

interface WritingAssistantProps {
  prompt: string;
  content: string;
  currentSentence: string;
  className?: string;
}

const QUALITY_STYLES: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  good: { bg: "rgba(34,197,94,0.08)", text: "#16a34a", label: "表达不错", icon: "✓" },
  ok: { bg: "rgba(245,158,11,0.08)", text: "#d97706", label: "可以更好", icon: "→" },
  weak: { bg: "rgba(239,68,68,0.08)", text: "#dc2626", label: "需要改进", icon: "!" },
};

const HINT_TYPE_LABELS: Record<string, { color: string; label: string }> = {
  expression: { color: "#3b82f6", label: "表达" },
  grammar: { color: "#dc2626", label: "语法" },
  structure: { color: "#9333ea", label: "结构" },
  vocabulary: { color: "#d97706", label: "词汇" },
  coherence: { color: "#0d9488", label: "连贯" },
};

export default function WritingAssistant({
  prompt, content, currentSentence, className = "",
}: WritingAssistantProps) {
  const [hints, setHints] = useState<RealtimeHintResult | null>(null);
  const [paragraphReview, setParagraphReview] = useState<ParagraphReviewResult | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"hints" | "listen" | "review">("hints");
  const [autoHint, setAutoHint] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const lastSentenceRef = useRef("");
  const lastParagraphCountRef = useRef(0);

  useEffect(() => {
    if (!autoHint || !currentSentence.trim() || currentSentence === lastSentenceRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (currentSentence.trim().length >= 10) {
        fetchHint(currentSentence);
        lastSentenceRef.current = currentSentence;
      }
    }, 2000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [currentSentence, autoHint]);

  useEffect(() => {
    const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());
    if (paragraphs.length > lastParagraphCountRef.current && lastParagraphCountRef.current > 0) {
      const completed = paragraphs[paragraphs.length - 2];
      if (completed && completed.trim().length > 20) {
        fetchParagraphReview(completed, paragraphs.length - 2);
      }
    }
    lastParagraphCountRef.current = paragraphs.length;
  }, [content]);

  const fetchHint = useCallback(async (text: string) => {
    setHintLoading(true);
    try {
      const r = await api.post<RealtimeHintResult>("/writing/realtime-hint", {
        prompt, full_content: content, current_text: text,
      });
      setHints(r);
    } catch { /* ignore */ }
    finally { setHintLoading(false); }
  }, [prompt, content]);

  const fetchParagraphReview = useCallback(async (paragraph: string, index: number) => {
    setReviewLoading(true);
    try {
      const r = await api.post<ParagraphReviewResult>("/writing/paragraph-review", {
        prompt, full_content: content, paragraph, paragraph_index: index,
      });
      setParagraphReview(r);
      setActiveTab("review");
    } catch { /* ignore */ }
    finally { setReviewLoading(false); }
  }, [prompt, content]);

  return (
    <div className={`rounded-xl overflow-hidden ${className}`}
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      <div className="flex items-center justify-between px-3 py-2" style={{ background: "var(--color-surface-hover)" }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--color-text)" }}>写作助手</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--color-border)", color: "var(--color-text-secondary)" }}>
            {content.split(/\s+/).filter(Boolean).length} 词
          </span>
        </div>
        <button onClick={() => setAutoHint(!autoHint)} className="text-xs px-2 py-0.5 rounded transition-all"
          style={{ background: autoHint ? "rgba(34,197,94,0.1)" : "var(--color-surface-hover)", color: autoHint ? "#16a34a" : "var(--color-text-secondary)" }}>
          {autoHint ? "自动提示 ON" : "自动提示 OFF"}
        </button>
      </div>

      <div className="flex gap-1 px-3 pt-2">
        {([{ key: "hints" as const, label: "实时提示" }, { key: "listen" as const, label: "朗读自检" }, { key: "review" as const, label: "段落审视" }]).map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="text-xs px-2.5 py-1 rounded-md transition-all"
            style={{ background: activeTab === tab.key ? "var(--color-primary)" : "transparent", color: activeTab === tab.key ? "#fff" : "var(--color-text-secondary)" }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-3 min-h-[120px]">
        {activeTab === "hints" && <HintsPanel hints={hints} loading={hintLoading} onManualTrigger={() => { if (currentSentence.trim()) fetchHint(currentSentence); }} />}
        {activeTab === "listen" && <ListenPanel content={content} />}
        {activeTab === "review" && <ReviewPanel review={paragraphReview} loading={reviewLoading} />}
      </div>
    </div>
  );
}

function HintsPanel({ hints, loading, onManualTrigger }: { hints: RealtimeHintResult | null; loading: boolean; onManualTrigger: () => void }) {
  if (loading) return <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-secondary)" }}><span className="animate-spin">⟳</span> 分析中...</div>;
  if (!hints) return (
    <div className="text-center py-4">
      <p className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>开始写作后，助手会自动分析你的句子</p>
      <button onClick={onManualTrigger} className="text-xs px-3 py-1 rounded-lg" style={{ background: "var(--color-surface-hover)", color: "var(--color-primary)" }}>手动获取提示</button>
    </div>
  );
  const quality = QUALITY_STYLES[hints.sentence_quality] || QUALITY_STYLES.ok;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: quality.bg, color: quality.text }}>{quality.icon} {quality.label}</span>
        {hints.encouragement && <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{hints.encouragement}</span>}
      </div>
      {hints.hints.map((hint, i) => {
        const t = HINT_TYPE_LABELS[hint.type] || { color: "#6b7280", label: hint.type };
        return (
          <div key={i} className="p-2 rounded-lg" style={{ background: "var(--color-surface-hover)" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded text-white" style={{ background: t.color }}>{t.label}</span>
              {hint.target_text && <span className="text-xs italic" style={{ color: t.color }}>&ldquo;{hint.target_text}&rdquo;</span>}
            </div>
            <p className="text-xs" style={{ color: "var(--color-text)" }}>{hint.hint}</p>
            {hint.direction && <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>→ {hint.direction}</p>}
          </div>
        );
      })}
      {hints.sentence_pattern_suggestion && (
        <div className="p-2 rounded-lg" style={{ background: "rgba(168,85,247,0.06)", border: "1px dashed rgba(168,85,247,0.3)" }}>
          <span className="text-xs font-medium" style={{ color: "#9333ea" }}>句型提示</span>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text)" }}>{hints.sentence_pattern_suggestion}</p>
        </div>
      )}
    </div>
  );
}

function ListenPanel({ content }: { content: string }) {
  const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim());
  if (!content.trim()) return <div className="text-center py-4 text-xs" style={{ color: "var(--color-text-secondary)" }}>开始写作后，可以在这里听自己写的英文</div>;
  return (
    <div className="space-y-3">
      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>听听自己写的英文是否通顺</p>
      <SyncReader text={content} />
      {paragraphs.length > 1 && (
        <div>
          <span className="text-xs font-medium mb-1.5 block" style={{ color: "var(--color-text)" }}>逐段朗读</span>
          <div className="space-y-1.5">
            {paragraphs.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <AudioPlayer text={p} compact label={`P${i + 1}`} />
                <span className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>{p.slice(0, 50)}{p.length > 50 ? "..." : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewPanel({ review, loading }: { review: ParagraphReviewResult | null; loading: boolean }) {
  if (loading) return <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-text-secondary)" }}><span className="animate-spin">⟳</span> 审视段落中...</div>;
  if (!review) return <div className="text-center py-4 text-xs" style={{ color: "var(--color-text-secondary)" }}>写完一个段落后（按两次回车换段），助手会自动审视</div>;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>连贯性</span>
        <div className="flex gap-0.5">{[1,2,3,4,5].map((d) => <div key={d} className="w-4 h-1.5 rounded-full" style={{ background: d <= review.coherence_score ? "#3b82f6" : "var(--color-border)" }} />)}</div>
        {!review.has_topic_sentence && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.1)", color: "#d97706" }}>缺少主题句</span>}
      </div>
      {review.expression_highlights.length > 0 && (
        <div>
          <span className="text-xs font-medium" style={{ color: "#16a34a" }}>写得好的地方</span>
          {review.expression_highlights.map((e, i) => (
            <div key={i} className="text-xs mt-1 flex items-start gap-1.5">
              <span style={{ color: "#16a34a" }}>✓</span>
              <span><span className="font-medium" style={{ color: "#16a34a" }}>&ldquo;{e.text}&rdquo;</span> <span style={{ color: "var(--color-text-secondary)" }}>— {e.praise}</span></span>
            </div>
          ))}
        </div>
      )}
      {review.improvement_directions.length > 0 && (
        <div>
          <span className="text-xs font-medium" style={{ color: "#d97706" }}>可以改进</span>
          {review.improvement_directions.map((d, i) => (
            <div key={i} className="text-xs mt-1 p-2 rounded-lg" style={{ background: "var(--color-surface-hover)" }}>
              <span className="font-medium" style={{ color: "#d97706" }}>{d.aspect}：</span>
              <span style={{ color: "var(--color-text)" }}>{d.hint}</span>
            </div>
          ))}
        </div>
      )}
      {review.next_paragraph_hint && (
        <div className="p-2 rounded-lg" style={{ background: "rgba(59,130,246,0.06)", border: "1px dashed rgba(59,130,246,0.2)" }}>
          <span className="text-xs font-medium" style={{ color: "#3b82f6" }}>下一段可以...</span>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text)" }}>{review.next_paragraph_hint}</p>
        </div>
      )}
    </div>
  );
}
