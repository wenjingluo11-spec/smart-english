/**
 * 认知增强共享样式常量 — 所有认知组件统一引用此文件。
 */

export const ACTION_STYLES: Record<string, { bg: string; border: string; label: string }> = {
  focus: { bg: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.5)", label: "聚焦" },
  scan: { bg: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", label: "扫读" },
  compare: { bg: "rgba(245,158,11,0.15)", border: "2px solid rgba(245,158,11,0.5)", label: "对比" },
  skip: { bg: "rgba(156,163,175,0.1)", border: "1px dashed rgba(156,163,175,0.4)", label: "跳过" },
  return: { bg: "rgba(139,92,246,0.12)", border: "2px solid rgba(139,92,246,0.4)", label: "回看" },
};

export const SEMANTIC_STYLES: Record<string, { underline: string; badge: string; label: string }> = {
  question_eye: { underline: "#dc2626", badge: "#dc2626", label: "题眼" },
  signal_word: { underline: "#d97706", badge: "#d97706", label: "信号词" },
  key_info: { underline: "#2563eb", badge: "#2563eb", label: "关键信息" },
  context_clue: { underline: "#0891b2", badge: "#0891b2", label: "线索" },
  distractor: { underline: "#9ca3af", badge: "#9ca3af", label: "干扰" },
  normal: { underline: "transparent", badge: "#6b7280", label: "" },
};

export const HIGHLIGHT_STYLES: Record<string, { bg: string; border: string; text: string; decoration: string }> = {
  question_eye: { bg: "rgba(239,68,68,0.2)", border: "2px solid rgba(239,68,68,0.8)", text: "#b91c1c", decoration: "underline wavy #b91c1c" },
  key_phrase: { bg: "rgba(239,68,68,0.12)", border: "2px solid rgba(239,68,68,0.5)", text: "#dc2626", decoration: "underline wavy #dc2626" },
  signal_word: { bg: "rgba(245,158,11,0.15)", border: "2px solid rgba(245,158,11,0.5)", text: "#d97706", decoration: "underline #d97706" },
  distractor: { bg: "rgba(156,163,175,0.12)", border: "1px dashed rgba(156,163,175,0.5)", text: "#6b7280", decoration: "line-through #9ca3af" },
  clue: { bg: "rgba(59,130,246,0.1)", border: "2px solid rgba(59,130,246,0.4)", text: "#2563eb", decoration: "underline #2563eb" },
};

export const ROLE_COLORS: Record<string, string> = {
  subject: "#dc2626", predicate: "#2563eb", object: "#16a34a",
  adverbial: "#d97706", attributive: "#0891b2", complement: "#7c3aed", clause: "#6b7280",
};

export const PURPOSE_COLORS: Record<string, string> = {
  introduction: "#2563eb", argument: "#dc2626", example: "#d97706",
  transition: "#0891b2", conclusion: "#6b7280",
};

export const STEM_ROLE_STYLES: Record<string, { bg: string; border: string; label: string; icon: string }> = {
  question: { bg: "rgba(239,68,68,0.12)", border: "2px solid rgba(239,68,68,0.5)", label: "问题", icon: "?" },
  condition: { bg: "rgba(59,130,246,0.1)", border: "2px solid rgba(59,130,246,0.4)", label: "条件", icon: "!" },
  background: { bg: "rgba(156,163,175,0.08)", border: "1px solid rgba(156,163,175,0.3)", label: "背景", icon: "~" },
  noise: { bg: "rgba(156,163,175,0.05)", border: "1px dashed rgba(156,163,175,0.2)", label: "干扰", icon: "x" },
};

export const STEM_PRIORITY_STYLES: Record<string, { opacity: number; badge: string; badgeBg: string }> = {
  must_read: { opacity: 1, badge: "必读", badgeBg: "#dc2626" },
  skim: { opacity: 0.6, badge: "略读", badgeBg: "#d97706" },
  skip: { opacity: 0.45, badge: "可跳", badgeBg: "#9ca3af" },
};
