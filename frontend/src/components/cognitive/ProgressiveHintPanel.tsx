"use client";

import { useState, useCallback } from "react";
import AudioPlayer from "@/components/cognitive/AudioPlayer";

export interface HintLevel {
  level: number;
  hint: string;
}

export interface GuidedDiscovery {
  question: string;
  follow_up?: string;
}

export interface ProgressiveHintData {
  /** 是否回答正确 */
  is_correct: boolean;
  /** 正确答案（渐进披露，最后才显示） */
  correct_answer?: string;
  /** 3级渐进提示 */
  hint_levels?: HintLevel[] | string[];
  /** 苏格拉底式引导提问 */
  guided_discovery?: GuidedDiscovery | string;
  /** 学霸怎么看的 */
  how_to_spot?: string;
  /** 关键线索 */
  key_clues?: { text: string; role: string }[];
  /** 常见陷阱 */
  common_trap?: string;
  /** 解题方法 */
  method?: string;
  /** 传统解析（兜底） */
  explanation?: string;
  /** 知识点 */
  knowledge_point?: string;
  /** 掌握度变化 */
  mastery_before?: number;
  mastery_after?: number;
}

interface ProgressiveHintPanelProps {
  data: ProgressiveHintData;
  /** 用户选择"再想想"后的回调 */
  onRetry?: () => void;
  /** 用户确认看完所有提示后的回调（进入下一题） */
  onComplete: () => void;
  /** 紧凑模式（用于心流场景） */
  compact?: boolean;
  className?: string;
}

/** 渐进阶段 */
type Phase = "result" | "hint1" | "hint2" | "hint3" | "guided" | "reveal";

/**
 * 渐进式提示面板 — 认知增强的核心交互组件。
 *
 * 答错后不直接显示答案，而是逐级引导：
 * 1. 告知对错（不显示正确答案）
 * 2. 第一级提示（方向性）→ 学生可选"再想想"或"看下一级提示"
 * 3. 第二级提示（缩小范围）
 * 4. 第三级提示（接近答案）
 * 5. 引导式提问（苏格拉底式）
 * 6. 最终揭示答案 + 完整认知增强反馈
 *
 * 答对时直接显示认知增强内容（强化正确思路）。
 */
export default function ProgressiveHintPanel({
  data,
  onRetry,
  onComplete,
  compact = false,
  className = "",
}: ProgressiveHintPanelProps) {
  const [phase, setPhase] = useState<Phase>(data.is_correct ? "reveal" : "result");

  const hints = normalizeHints(data.hint_levels);
  const guided = normalizeGuided(data.guided_discovery);
  const hasHints = hints.length > 0;

  const advancePhase = useCallback(() => {
    if (phase === "result" && hints.length > 0) setPhase("hint1");
    else if (phase === "result") setPhase(guided ? "guided" : "reveal");
    else if (phase === "hint1" && hints.length > 1) setPhase("hint2");
    else if (phase === "hint1") setPhase(guided ? "guided" : "reveal");
    else if (phase === "hint2" && hints.length > 2) setPhase("hint3");
    else if (phase === "hint2") setPhase(guided ? "guided" : "reveal");
    else if (phase === "hint3") setPhase(guided ? "guided" : "reveal");
    else if (phase === "guided") setPhase("reveal");
    else setPhase("reveal");
  }, [phase, hints.length, guided]);

  const phaseIndex = ["result", "hint1", "hint2", "hint3", "guided", "reveal"].indexOf(phase);
  const totalSteps = 1 + hints.length + (guided ? 1 : 0) + 1;
  const currentStep = Math.min(phaseIndex + 1, totalSteps);

  // 答对：直接显示强化内容
  if (data.is_correct) {
    return (
      <div className={`space-y-3 ${className}`}>
        <ResultBanner isCorrect knowledgePoint={data.knowledge_point}
          masteryBefore={data.mastery_before} masteryAfter={data.mastery_after} />
        {data.how_to_spot && (
          <CogBlock color="blue" label="学霸也是这么看的" icon="🎯" compact={compact}>
            <p className="text-sm leading-relaxed">{data.how_to_spot}</p>
            <AudioPlayer text={data.how_to_spot} compact label="听" />
          </CogBlock>
        )}
        {data.method && (
          <CogBlock color="green" label="解题方法" icon="✅" compact={compact}>
            <p className="text-sm">{data.method}</p>
          </CogBlock>
        )}
        <button onClick={onComplete}
          className="w-full py-3 rounded-xl text-white font-medium"
          style={{ background: "var(--color-primary)" }}>
          下一题
        </button>
      </div>
    );
  }

  // 答错：渐进式引导
  return (
    <div className={`space-y-3 ${className}`}>
      {/* 进度条 */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(currentStep / totalSteps) * 100}%`, background: "var(--color-primary)" }} />
        </div>
        <span className="text-xs shrink-0" style={{ color: "var(--color-text-secondary)" }}>
          {phase === "reveal" ? "答案揭示" : `提示 ${currentStep}/${totalSteps}`}
        </span>
      </div>

      {/* 对错判定（始终显示，但不显示正确答案） */}
      <ResultBanner isCorrect={false} showAnswer={phase === "reveal"} correctAnswer={data.correct_answer}
        knowledgePoint={data.knowledge_point} masteryBefore={data.mastery_before} masteryAfter={data.mastery_after} />

      {/* 渐进提示 */}
      {phase === "result" && !hasHints && !guided && (
        <FallbackHint text={data.explanation || "再仔细看看题目，注意关键词。"} />
      )}

      {(phase === "hint1" || phaseIndex > 1) && hints[0] && (
        <HintCard level={1} text={hints[0]} compact={compact} />
      )}
      {(phase === "hint2" || phaseIndex > 2) && hints[1] && (
        <HintCard level={2} text={hints[1]} compact={compact} />
      )}
      {(phase === "hint3" || phaseIndex > 3) && hints[2] && (
        <HintCard level={3} text={hints[2]} compact={compact} />
      )}

      {/* 引导式提问 */}
      {(phase === "guided" || phase === "reveal") && guided && (
        <CogBlock color="purple" label="想一想" icon="🤔" compact={compact}>
          <p className="text-sm leading-relaxed font-medium">{guided}</p>
        </CogBlock>
      )}

      {/* 最终揭示：完整认知增强反馈 */}
      {phase === "reveal" && (
        <div className="space-y-3 animate-fade-in">
          {data.how_to_spot && (
            <CogBlock color="blue" label="学霸怎么看的" icon="🎯" compact={compact}>
              <p className="text-sm leading-relaxed">{data.how_to_spot}</p>
              {!compact && <AudioPlayer text={data.how_to_spot} compact label="听" />}
            </CogBlock>
          )}
          {data.key_clues && data.key_clues.length > 0 && (
            <CogBlock color="gray" label="关键线索" icon="🔍" compact={compact}>
              <div className="space-y-1">
                {data.key_clues.map((clue, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-500 mt-0.5 shrink-0">{"\u25b8"}</span>
                    <span>
                      <span className="font-medium" style={{ color: "#2563eb" }}>{clue.text}</span>
                      <span className="mx-1" style={{ color: "#9ca3af" }}>{"\u2014"}</span>
                      <span style={{ color: "var(--color-text-secondary)" }}>{clue.role}</span>
                    </span>
                  </div>
                ))}
              </div>
            </CogBlock>
          )}
          {data.common_trap && (
            <CogBlock color="amber" label="常见陷阱" icon="⚠️" compact={compact}>
              <p className="text-sm">{data.common_trap}</p>
            </CogBlock>
          )}
          {data.method && (
            <CogBlock color="green" label="解题方法" icon="💡" compact={compact}>
              <p className="text-sm">{data.method}</p>
            </CogBlock>
          )}
          {/* 兜底传统解析 */}
          {!data.how_to_spot && !data.common_trap && !data.method && data.explanation && (
            <CogBlock color="gray" label="解析" icon="📝" compact={compact}>
              <p className="text-sm">{data.explanation}</p>
            </CogBlock>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        {phase !== "reveal" && onRetry && (
          <button onClick={onRetry}
            className="flex-1 py-3 rounded-xl font-medium text-sm"
            style={{ background: "var(--color-bg)", color: "var(--color-primary)", border: "1px solid var(--color-primary)" }}>
            再想想
          </button>
        )}
        {phase !== "reveal" ? (
          <button onClick={advancePhase}
            className="flex-1 py-3 rounded-xl font-medium text-sm text-white"
            style={{ background: "var(--color-primary)" }}>
            {phase === "result" && hasHints ? "给我一点提示" : "看下一级提示"}
          </button>
        ) : (
          <button onClick={onComplete}
            className="flex-1 py-3 rounded-xl font-medium text-sm text-white"
            style={{ background: "var(--color-primary)" }}>
            我看懂了，下一题
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
      `}</style>
    </div>
  );
}

/* ── 子组件 ── */

const HINT_COLORS = ["#3b82f6", "#f59e0b", "#ef4444"];
const HINT_LABELS = ["方向提示", "缩小范围", "接近答案"];

function HintCard({ level, text, compact }: { level: number; text: string; compact: boolean }) {
  const color = HINT_COLORS[level - 1] || "#3b82f6";
  return (
    <div className={`${compact ? "p-3" : "p-4"} rounded-xl animate-fade-in`}
      style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: color }}>{level}</span>
        <span className="text-xs font-semibold" style={{ color }}>{HINT_LABELS[level - 1]}</span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>{text}</p>
    </div>
  );
}

function FallbackHint({ text }: { text: string }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
      <p className="text-sm" style={{ color: "var(--color-text)" }}>{text}</p>
    </div>
  );
}

const BLOCK_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  blue: { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.15)", label: "#2563eb" },
  green: { bg: "rgba(16,185,129,0.06)", border: "rgba(16,185,129,0.15)", label: "#059669" },
  amber: { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.15)", label: "#d97706" },
  purple: { bg: "rgba(139,92,246,0.06)", border: "rgba(139,92,246,0.15)", label: "#7c3aed" },
  gray: { bg: "var(--color-surface-hover, #f9fafb)", border: "transparent", label: "#6b7280" },
};

function CogBlock({ color, label, icon, compact, children }: {
  color: string; label: string; icon: string; compact: boolean; children: React.ReactNode;
}) {
  const c = BLOCK_COLORS[color] || BLOCK_COLORS.gray;
  return (
    <div className={`${compact ? "p-3" : "p-4"} rounded-xl`}
      style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-semibold" style={{ color: c.label }}>{label}</span>
      </div>
      <div style={{ color: "var(--color-text)" }}>{children}</div>
    </div>
  );
}

function ResultBanner({ isCorrect, showAnswer, correctAnswer, knowledgePoint, masteryBefore, masteryAfter }: {
  isCorrect: boolean; showAnswer?: boolean; correctAnswer?: string;
  knowledgePoint?: string; masteryBefore?: number; masteryAfter?: number;
}) {
  return (
    <div className="p-4 rounded-2xl space-y-2" style={{
      background: isCorrect ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${isCorrect ? "#bbf7d0" : "#fecaca"}`,
    }}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{isCorrect ? "✅" : "❌"}</span>
        <span className="font-medium" style={{ color: isCorrect ? "#16a34a" : "#dc2626" }}>
          {isCorrect ? "回答正确！" : "回答错误"}
        </span>
      </div>
      {showAnswer && correctAnswer && (
        <p className="text-sm" style={{ color: "#374151" }}>
          正确答案：<span className="font-medium">{correctAnswer}</span>
        </p>
      )}
      {!showAnswer && !isCorrect && (
        <p className="text-xs" style={{ color: "#9ca3af" }}>先不看答案，跟着提示自己想想</p>
      )}
      {knowledgePoint && (
        <p className="text-xs" style={{ color: "#6b7280" }}>📌 知识点：{knowledgePoint}</p>
      )}
      {masteryBefore !== undefined && masteryAfter !== undefined && (
        <div className="flex items-center gap-2 text-xs" style={{ color: "#6b7280" }}>
          <span>掌握度</span>
          <span>{Math.round(masteryBefore * 100)}%</span>
          <span>{"\u2192"}</span>
          <span style={{ color: masteryAfter > masteryBefore ? "#16a34a" : masteryAfter < masteryBefore ? "#dc2626" : "#6b7280", fontWeight: 500 }}>
            {Math.round(masteryAfter * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

/* ── 工具函数 ── */

function normalizeHints(raw?: HintLevel[] | string[]): string[] {
  if (!raw || raw.length === 0) return [];
  return raw.map((h) => (typeof h === "string" ? h : h.hint)).filter(Boolean);
}

function normalizeGuided(raw?: GuidedDiscovery | string): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw || null;
  return raw.question || null;
}
