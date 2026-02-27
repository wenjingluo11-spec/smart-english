"use client";

import AudioPlayer from "@/components/cognitive/AudioPlayer";

export interface CognitiveFeedbackData {
  how_to_spot?: string;
  key_clues?: { text: string; role: string }[];
  common_trap?: string;
  method?: string;
  reading_order?: { step: number; target: string; action: string; reason: string }[];
}

interface CognitiveFeedbackProps {
  data: CognitiveFeedbackData;
  /** 是否显示 TTS 播放按钮 */
  showAudio?: boolean;
  /** 紧凑模式（用于心流等快速场景） */
  compact?: boolean;
  className?: string;
}

/**
 * 统一认知增强反馈组件 — 渲染 how_to_spot / key_clues / common_trap / method / reading_order。
 *
 * 用于替代各页面中重复的认知反馈内联渲染代码。
 */
export default function CognitiveFeedback({
  data,
  showAudio = true,
  compact = false,
  className = "",
}: CognitiveFeedbackProps) {
  const { how_to_spot, key_clues, common_trap, method, reading_order } = data;
  const hasContent = how_to_spot || (key_clues && key_clues.length > 0) || common_trap || method;

  if (!hasContent) return null;

  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        {how_to_spot && (
          <div className="p-3 rounded-xl text-sm"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
            <span className="text-xs font-semibold" style={{ color: "#2563eb" }}>学霸怎么看的：</span>
            <span className="ml-1" style={{ color: "var(--color-text)" }}>{how_to_spot}</span>
          </div>
        )}
        {key_clues && key_clues.length > 0 && (
          <div className="p-3 rounded-xl text-sm" style={{ background: "var(--color-surface-hover, #f9fafb)" }}>
            <span className="text-xs font-semibold" style={{ color: "#6b7280" }}>关键线索：</span>
            {key_clues.map((clue, i) => (
              <span key={i} className="ml-1">
                <span className="font-medium" style={{ color: "#2563eb" }}>{clue.text}</span>
                <span style={{ color: "#9ca3af" }}>({clue.role})</span>
                {i < key_clues.length - 1 && <span style={{ color: "#d1d5db" }}> · </span>}
              </span>
            ))}
          </div>
        )}
        {common_trap && (
          <div className="p-3 rounded-xl text-sm"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <span className="text-xs font-semibold" style={{ color: "#d97706" }}>陷阱：</span>
            <span className="ml-1" style={{ color: "var(--color-text)" }}>{common_trap}</span>
          </div>
        )}
        {method && (
          <div className="p-3 rounded-xl text-sm"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
            <span className="text-xs font-semibold" style={{ color: "#059669" }}>方法：</span>
            <span className="ml-1" style={{ color: "var(--color-text)" }}>{method}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 学霸审题思路 */}
      {how_to_spot && (
        <div className="p-4 rounded-xl animate-slide-up"
          style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.06), rgba(139,92,246,0.06))", border: "1px solid rgba(59,130,246,0.15)" }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">🎯</span>
            <span className="text-xs font-semibold" style={{ color: "#2563eb" }}>学霸怎么看的</span>
            {showAudio && <AudioPlayer text={how_to_spot} compact label="听" />}
          </div>
          <div className="text-sm leading-relaxed" style={{ color: "var(--color-text)" }}>
            {how_to_spot}
          </div>
        </div>
      )}

      {/* 关键线索 */}
      {key_clues && key_clues.length > 0 && (
        <div className="p-4 rounded-xl animate-slide-up" style={{ background: "var(--color-surface-hover)" }}>
          <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>
            关键线索
          </div>
          <div className="space-y-1.5">
            {key_clues.map((clue, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-blue-500 mt-0.5 shrink-0">▸</span>
                <span>
                  <span className="font-medium" style={{ color: "#2563eb" }}>{clue.text}</span>
                  <span className="mx-1" style={{ color: "var(--color-text-secondary)" }}>—</span>
                  <span style={{ color: "var(--color-text-secondary)" }}>{clue.role}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 常见陷阱 + 解题方法 */}
      {(common_trap || method) && (
        <div className="flex gap-3 flex-wrap">
          {common_trap && (
            <div className="flex-1 min-w-[200px] p-3 rounded-xl animate-slide-up text-sm"
              style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <div className="text-xs font-semibold mb-1" style={{ color: "#d97706" }}>常见陷阱</div>
              <div style={{ color: "var(--color-text)" }}>{common_trap}</div>
            </div>
          )}
          {method && (
            <div className="flex-1 min-w-[200px] p-3 rounded-xl animate-slide-up text-sm"
              style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <div className="text-xs font-semibold mb-1" style={{ color: "#059669" }}>解题方法</div>
              <div style={{ color: "var(--color-text)" }}>{method}</div>
            </div>
          )}
        </div>
      )}

      {/* 审题顺序 */}
      {reading_order && reading_order.length > 0 && (
        <div className="p-4 rounded-xl animate-slide-up" style={{ background: "var(--color-surface-hover)" }}>
          <div className="text-xs font-semibold mb-2" style={{ color: "var(--color-text-secondary)" }}>
            审题顺序 — 学霸这样看题
          </div>
          <div className="space-y-2">
            {reading_order.map((step) => (
              <div key={step.step} className="flex items-start gap-2 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}>
                  {step.step}
                </span>
                <div>
                  <span className="font-medium" style={{ color: "var(--color-text)" }}>{step.target}</span>
                  <span className="mx-1" style={{ color: "var(--color-text-secondary)" }}>→</span>
                  <span style={{ color: "var(--color-text-secondary)" }}>{step.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
