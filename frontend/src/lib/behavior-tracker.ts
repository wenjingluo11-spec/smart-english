/**
 * 行为事件追踪器 — 前端埋点 SDK。
 *
 * V4.1: 采集用户在题目上的细粒度交互行为，批量上报后端。
 *
 * 使用方式：
 *   import { tracker } from "@/lib/behavior-tracker";
 *   tracker.track("question_view", { question_id: 123 }, { duration_ms: 5000 });
 */

import { api } from "@/lib/api";

const SESSION_ID =
  typeof window !== "undefined"
    ? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    : "ssr";

const FLUSH_INTERVAL = 10_000; // 10 seconds
const MAX_BUFFER = 50;

interface RawEvent {
  module: string;
  question_id?: number;
  material_id?: number;
  event_type: string;
  event_data?: Record<string, unknown>;
  timestamp_ms: number;
  duration_ms?: number;
}

let buffer: RawEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

function ensureTimer() {
  if (flushTimer || typeof window === "undefined") return;
  flushTimer = setInterval(flush, FLUSH_INTERVAL);
  window.addEventListener("beforeunload", flush);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

async function flush() {
  if (buffer.length === 0) return;
  const batch = buffer.splice(0, buffer.length);
  try {
    await api.post("/behavior/events", {
      session_id: SESSION_ID,
      events: batch,
    });
  } catch {
    // 失败时放回 buffer 头部（最多保留 200 条防止内存泄漏）
    buffer = [...batch, ...buffer].slice(0, 200);
  }
}

/** 推断当前模块 */
function detectModule(): string {
  if (typeof window === "undefined") return "unknown";
  const path = window.location.pathname;
  if (path.includes("/practice")) return "practice";
  if (path.includes("/reading")) return "reading";
  if (path.includes("/writing")) return "writing";
  if (path.includes("/grammar")) return "grammar";
  if (path.includes("/exam")) return "exam";
  if (path.includes("/vocabulary")) return "vocabulary";
  if (path.includes("/story")) return "story";
  if (path.includes("/tutor")) return "tutor";
  return "other";
}

/** 追踪一个行为事件 */
function track(
  eventType: string,
  context?: {
    module?: string;
    question_id?: number;
    material_id?: number;
  },
  extra?: {
    duration_ms?: number;
    event_data?: Record<string, unknown>;
  },
) {
  ensureTimer();
  buffer.push({
    module: context?.module || detectModule(),
    question_id: context?.question_id,
    material_id: context?.material_id,
    event_type: eventType,
    event_data: extra?.event_data,
    timestamp_ms: Date.now(),
    duration_ms: extra?.duration_ms,
  });
  if (buffer.length >= MAX_BUFFER) flush();
}

/** 追踪题目查看（自动计时） */
function trackQuestionView(questionId: number, module?: string) {
  const startTime = Date.now();
  return {
    end: () => {
      track("question_view", { question_id: questionId, module }, {
        duration_ms: Date.now() - startTime,
      });
    },
  };
}

export const tracker = {
  track,
  trackQuestionView,
  flush,
  get sessionId() { return SESSION_ID; },
};
