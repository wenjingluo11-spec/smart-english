"use client";

import { useState } from "react";
import TextHighlighter, {
  type Highlight,
} from "@/components/cognitive/TextHighlighter";
import SyncReader from "@/components/cognitive/SyncReader";
import ExpertDemo from "@/components/cognitive/ExpertDemo";
import MultimodalEnhancer from "@/components/cognitive/MultimodalEnhancer";
import StemNavigator from "@/components/cognitive/StemNavigator";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

type TabKey = "highlight" | "karaoke" | "expert" | "multimodal" | "stem";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "highlight", label: "静态文本高亮", icon: "🎨" },
  { key: "karaoke", label: "视听同步阅读", icon: "🎤" },
  { key: "expert", label: "学霸审题演示", icon: "👁" },
  { key: "multimodal", label: "多模态融合", icon: "🎯" },
  { key: "stem", label: "长题干导航", icon: "🔍" },
];

const Q1_TEXT =
  "The research team announced that they _____ a new method to reduce carbon emissions by 40% before the end of next year.";

const _h = (
  text: string,
  type: Highlight["type"],
  label: string,
): Highlight => {
  const start = Q1_TEXT.indexOf(text);
  return { text, type, label, start, end: start + text.length };
};

const Q1_HIGHLIGHTS: Highlight[] = [
  _h(
    "before the end of next year",
    "question_eye",
    "题眼：by/before + 将来时间 = 将来完成时",
  ),
  _h("announced", "signal_word", "信号词：主句过去时"),
  _h("a new method", "clue", "线索：develop 的宾语"),
  _h(
    "to reduce carbon emissions by 40%",
    "distractor",
    "干扰：目的状语，不影响时态",
  ),
];

const Q2_TEXT =
  "Last summer, I volunteered at a wildlife rescue center. On my first day, I was asked to feed a baby deer that had been abandoned by its mother. At first, the deer was afraid of me and refused to eat. I sat quietly beside it for hours, speaking softly. Gradually, it began to trust me. By the end of the week, it would run to me whenever I arrived. This experience taught me that trust is not given — it must be earned through patience and kindness.";

const Q3_TEXT =
  "In recent years, the concept of 'digital detox' has gained significant attention as more people recognize the negative effects of excessive screen time on mental health. A 2024 study conducted by researchers at Stanford University surveyed over 5,000 participants aged 18-35 and found that those who spent more than six hours daily on social media reported higher levels of anxiety and depression compared to those who limited their usage to under two hours. The study also revealed an interesting paradox: while 78% of heavy users acknowledged that social media negatively affected their well-being, only 23% had actually attempted to reduce their screen time. Dr. Sarah Chen, the lead researcher, explained that this gap between awareness and action is largely due to the addictive design of social media platforms, which use algorithms to maximize user engagement. She suggested that effective digital detox programs should combine gradual reduction strategies with alternative offline activities, rather than demanding complete abstinence.\n\nAccording to the passage, what is the main reason for the gap between users' awareness of social media's harm and their failure to reduce usage?";

// 题目ID默认值（运行种子脚本后会动态获取实际ID）
const DEFAULT_IDS = [1, 2, 3];

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function CognitiveDemoPage() {
  const [tab, setTab] = useState<TabKey>("highlight");
  const [highlightMode, setHighlightMode] = useState<
    "normal" | "sequential" | "focus"
  >("normal");
  const [focusIdx, setFocusIdx] = useState(0);

  // 种子脚本运行后打印的题目ID，如果不匹配请修改这里
  const q1Id = DEFAULT_IDS[0];
  const q3Id = DEFAULT_IDS[2];

  const modeButtons: { mode: typeof highlightMode; label: string }[] = [
    { mode: "normal", label: "普通模式" },
    { mode: "sequential", label: "顺序揭示" },
    { mode: "focus", label: "焦点聚光" },
  ];

  const options = [
    { letter: "A", text: "will develop" },
    { letter: "B", text: "would have developed" },
    { letter: "C", text: "will have developed" },
    { letter: "D", text: "had developed" },
  ];

  /* ---- render tab content ---- */

  const renderContent = () => {
    switch (tab) {
      case "highlight":
        return (
          <div className="space-y-5">
            <h3
              style={{ color: "var(--color-text, #111)" }}
              className="text-lg font-semibold"
            >
              功能4：静态文本高亮
            </h3>
            <p
              style={{ color: "var(--color-text-secondary, #6b7280)" }}
              className="text-sm"
            >
              对题目文本进行语义分析，标注题眼、信号词、线索和干扰项，帮助学生快速定位关键信息。此功能纯前端渲染，无需后端支持。
            </p>

            {/* mode buttons */}
            <div className="flex gap-2">
              {modeButtons.map((b) => (
                <button
                  key={b.mode}
                  onClick={() => setHighlightMode(b.mode)}
                  className="rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    background:
                      highlightMode === b.mode
                        ? "#3b82f6"
                        : "var(--color-card, #fff)",
                    color:
                      highlightMode === b.mode
                        ? "#fff"
                        : "var(--color-text, #111)",
                    border: "1px solid var(--color-border, #e5e7eb)",
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* focus index selector */}
            {highlightMode === "focus" && (
              <div className="flex items-center gap-2">
                <span
                  className="text-sm"
                  style={{ color: "var(--color-text-secondary, #6b7280)" }}
                >
                  选择焦点：
                </span>
                {Q1_HIGHLIGHTS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setFocusIdx(i)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors"
                    style={{
                      background: focusIdx === i ? "#3b82f6" : "transparent",
                      color:
                        focusIdx === i
                          ? "#fff"
                          : "var(--color-text-secondary, #6b7280)",
                      border: "1px solid var(--color-border, #e5e7eb)",
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}

            {/* highlighter */}
            <TextHighlighter
              text={Q1_TEXT}
              highlights={Q1_HIGHLIGHTS}
              sequentialReveal={highlightMode === "sequential"}
              focusIndex={highlightMode === "focus" ? focusIdx : undefined}
            />

            {/* options grid */}
            <div className="grid grid-cols-2 gap-3">
              {options.map((opt) => {
                const isCorrect = opt.letter === "C";
                return (
                  <div
                    key={opt.letter}
                    className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
                    style={{
                      background: isCorrect
                        ? "#dcfce7"
                        : "var(--color-card, #fff)",
                      border: isCorrect
                        ? "1px solid #86efac"
                        : "1px solid var(--color-border, #e5e7eb)",
                      color: isCorrect ? "#166534" : "var(--color-text, #111)",
                    }}
                  >
                    <span className="font-semibold">{opt.letter}.</span>
                    <span>{opt.text}</span>
                    {isCorrect && <span className="ml-auto">✓</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );

      case "karaoke":
        return (
          <div className="space-y-5">
            <h3
              style={{ color: "var(--color-text, #111)" }}
              className="text-lg font-semibold"
            >
              功能3：视听同步阅读（卡拉OK逐词高亮）
            </h3>
            <p
              style={{ color: "var(--color-text-secondary, #6b7280)" }}
              className="text-sm"
            >
              需要后端 TTS
              服务支持。播放语音的同时逐词高亮文本，实现卡拉OK式的视听同步阅读体验。
            </p>
            <div
              className="rounded-xl p-5"
              style={{
                background: "var(--color-bg, #f9fafb)",
                border: "1px solid var(--color-border, #e5e7eb)",
              }}
            >
              <SyncReader
                text={Q2_TEXT}
                showProgress
                className="text-base"
              />
            </div>
          </div>
        );

      case "expert":
        return (
          <div className="space-y-5">
            <h3
              style={{ color: "var(--color-text, #111)" }}
              className="text-lg font-semibold"
            >
              功能2：学霸审题演示
            </h3>
            <p
              style={{ color: "var(--color-text-secondary, #6b7280)" }}
              className="text-sm"
            >
              需要后端 API 支持。模拟学霸审题过程：光标跟随 + 语义高亮 +
              内心独白，帮助学生理解高效审题的思维方式。
            </p>
            <ExpertDemo
              questionText={Q1_TEXT}
              questionId={q1Id}
              source="practice"
            />
          </div>
        );

      case "multimodal":
        return (
          <div className="space-y-5">
            <h3
              style={{ color: "var(--color-text, #111)" }}
              className="text-lg font-semibold"
            >
              功能1：多模态融合
            </h3>
            <p
              style={{ color: "var(--color-text-secondary, #6b7280)" }}
              className="text-sm"
            >
              需要后端 API 支持。提供视觉 / 听觉 /
              融合三种模式，根据学生的认知偏好选择最佳学习方式。
            </p>
            <MultimodalEnhancer
              questionText={Q1_TEXT}
              questionId={q1Id}
              source="practice"
            />
          </div>
        );

      case "stem":
        return (
          <div className="space-y-5">
            <h3
              style={{ color: "var(--color-text, #111)" }}
              className="text-lg font-semibold"
            >
              功能5：长题干导航
            </h3>
            <p
              style={{ color: "var(--color-text-secondary, #6b7280)" }}
              className="text-sm"
            >
              需要后端 API
              支持。对长篇阅读理解题干进行结构分段 +
              优先级标注，帮助学生快速把握文章脉络。
            </p>
            <StemNavigator questionText={Q3_TEXT} questionType="阅读理解" />
          </div>
        );

      default:
        return null;
    }
  };

  /* ---- main render ---- */

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: "var(--color-bg, #f9fafb)" }}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {/* title */}
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--color-text, #111)" }}
          >
            认知增强功能演示
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--color-text-secondary, #6b7280)" }}
          >
            五大认知增强模块的交互式演示，帮助学生更高效地理解和解答英语题目。
          </p>
        </div>

        {/* info box */}
        <div
          className="rounded-xl p-4 text-sm"
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1e40af",
          }}
        >
          <p className="mb-2 font-semibold">使用说明</p>
          <ol className="list-inside list-decimal space-y-1">
            <li>
              <code className="rounded bg-blue-100 px-1.5 py-0.5 text-xs">
                cd backend &amp;&amp; python -m scripts.seed_cognitive_demo
                &amp;&amp; uvicorn app.main:app --reload
              </code>
            </li>
            <li>
              登录账号：
              <code className="rounded bg-blue-100 px-1.5 py-0.5 text-xs">
                13800000001
              </code>{" "}
              / 密码：
              <code className="rounded bg-blue-100 px-1.5 py-0.5 text-xs">
                demo123456
              </code>
            </li>
            <li>
              Tab 1（静态文本高亮）为纯前端功能，无需后端即可体验
            </li>
          </ol>
        </div>

        {/* tab bar */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background:
                  tab === t.key ? "#3b82f6" : "var(--color-card, #fff)",
                color: tab === t.key ? "#fff" : "var(--color-text, #111)",
                border: "1px solid var(--color-border, #e5e7eb)",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* content card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "var(--color-card, #fff)",
            border: "1px solid var(--color-border, #e5e7eb)",
          }}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
