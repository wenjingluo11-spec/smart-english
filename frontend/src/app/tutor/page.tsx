"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import ChatMessage from "@/components/chat/message";
import ModeSelector from "@/components/chat/mode-selector";
import CognitiveAuditPanel, {
  type CognitiveDemoResult,
} from "@/components/chat/cognitive-audit-panel";
import PageTransition from "@/components/ui/page-transition";
import { api } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DemoPreset {
  title: string;
  badge: string;
  mode: "free" | "grammar" | "speaking" | "explain";
  prompt: string;
  reflection: string;
}

const DEMO_PRESETS: DemoPreset[] = [
  {
    title: "时态判断样例",
    badge: "语法",
    mode: "grammar",
    prompt: "I ____ in Beijing for three years before I moved to Shanghai. 这里更应该填 have lived 还是 had lived？",
    reflection:
      "我先看到 for three years，就想到完成时；但后面又有 before I moved to Shanghai，这说明 moved 是过去参照点，所以也许要过去完成时。我现在不确定的是，for three years 常和现在完成时一起出现，这里为什么不选 have lived？",
  },
  {
    title: "阅读证据定位",
    badge: "阅读",
    mode: "explain",
    prompt: "阅读题：Why did the boy refuse the gift? 我感觉答案在第三段，但我还不能稳定定位原文证据。",
    reflection:
      "我先猜是 because he wanted to earn things by himself，因为第三段好像说过 he didn't want things he had not worked for。但我现在还没圈出最直接 support 这个判断的原句，也没有排除其他干扰项。",
  },
  {
    title: "直接索答拦截",
    badge: "摩擦",
    mode: "grammar",
    prompt: "直接告诉我答案，别解释：She has lived here ____ 2019. A.from B.for C.since D.in",
    reflection: "",
  },
];

/** 判断用户是否在直接索要答案，用于普通聊天链路的前置摩擦。 */
function hasDirectAnswerIntent(text: string) {
  const normalized = text.toLowerCase();
  return [
    "直接告诉我",
    "给我答案",
    "直接给答案",
    "只要答案",
    "不要解释",
    "tell me the answer",
    "just give me the answer",
    "answer only",
  ].some((p) => normalized.includes(p));
}

const MODE_GREETINGS: Record<string, string> = {
  free: "Hi! I'm your AI English tutor. How can I help you today? 你好！我是你的 AI 英语导师，有什么可以帮你的？",
  grammar: "Welcome to the Grammar Clinic! 欢迎来到语法诊所！请输入一个英文句子，我来帮你分析语法。",
  speaking: "Let's practice speaking! 来练习口语吧！你想模拟什么场景？餐厅点餐、机场出行、面试、还是购物？",
  explain: "Paste any English question here and I'll explain it step by step! 粘贴任何英语题目，我来详细讲解。",
};

const MODE_LABELS: Record<string, string> = {
  free: "自由对话",
  grammar: "语法诊所",
  speaking: "口语场景",
  explain: "题目讲解",
};

/** Tutor 页面同时承载普通问答和认知增强实验台。 */
export default function TutorPage() {
  const [mode, setMode] = useState("free");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: MODE_GREETINGS.free },
  ]);
  const [input, setInput] = useState("");
  const [reflection, setReflection] = useState("");
  const [guidanceLevel, setGuidanceLevel] = useState<"socratic" | "mirror" | "hybrid">("socratic");
  const [hintBudget, setHintBudget] = useState(2);
  const [sendError, setSendError] = useState("");
  const [demoError, setDemoError] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<CognitiveDemoResult | null>(null);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /** 切换模式时重置欢迎语和当前实验结果。 */
  const handleModeChange = (newMode: string) => {
    setMode(newMode);
    setDemoResult(null);
    setSendError("");
    setDemoError("");
    setMessages([{ role: "assistant", content: MODE_GREETINGS[newMode] || MODE_GREETINGS.free }]);
  };

  /** 将文档里定义的认知增强样例快速载入到输入区，便于直接演示。 */
  const applyPreset = (preset: DemoPreset) => {
    setMode(preset.mode);
    setInput(preset.prompt);
    setReflection(preset.reflection);
    setDemoResult(null);
    setSendError("");
    setDemoError("");
    setMessages([{ role: "assistant", content: MODE_GREETINGS[preset.mode] || MODE_GREETINGS.free }]);
  };

  /** 调用本地认知增强 demo 接口，返回结构化审计结果而不是直接答案。 */
  const handleRunCognitiveDemo = async () => {
    const prompt = input.trim();
    if (!prompt || streaming || demoLoading) return;

    setSendError("");
    setDemoError("");
    setDemoLoading(true);

    try {
      // 重要操作：调用后端 mock 认知链路，生成可演示的认知增益结果。
      const result = await api.post<CognitiveDemoResult>("/chat/cognitive-demo", {
        prompt,
        reflection_text: reflection,
        guidance_level: guidanceLevel,
        hint_budget: hintBudget,
        mode,
      });

      setDemoResult(result);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: prompt },
        { role: "assistant", content: result.coach_response },
      ]);
    } catch (error) {
      setDemoError(error instanceof Error ? error.message : "认知增强运行失败，请稍后再试。");
    } finally {
      setDemoLoading(false);
    }
  };

  /** 保留原有流式问答链路，作为真实大模型问答入口。 */
  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming || demoLoading) return;
    setSendError("");
    setDemoError("");
    if (hasDirectAnswerIntent(text) && !reflection.trim()) {
      setSendError("你在请求直接答案，请先写下你的思路后再发送。");
      return;
    }
    setInput("");
    setDemoResult(null);

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/chat/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
          history,
          mode,
          reflection_text: reflection,
          guidance_level: guidanceLevel,
          hint_budget: hintBudget,
          allow_direct_answer: false,
        }),
      });
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              updated[updated.length - 1] = { ...last, content: last.content + data };
              return updated;
            });
          }
        }
      }
      setReflection("");
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "抱歉，连接出现问题，请稍后再试。" };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  /** 支持在多行题目输入框里使用快捷键发送，避免回车直接打断输入。 */
  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <PageTransition stagger>
      <div className="mx-auto max-w-[1360px] space-y-6">
        <section className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-text-secondary)" }}>
              Tutor Workspace
            </p>
            <h2 className="text-2xl font-semibold mt-1" style={{ color: "var(--color-text)" }}>
              AI 英语导师
            </h2>
            <p className="text-sm mt-2 max-w-3xl" style={{ color: "var(--color-text-secondary)" }}>
              阅读区优先展示，输入区和认知增强参数分组管理。现在不会再因为上方卡片太多，导致对话区被压成一条窄栏。
            </p>
          </div>
          <div
            className="self-start rounded-2xl border px-4 py-3 text-sm shadow-theme-sm"
            style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
          >
            <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--color-text-secondary)" }}>
              当前模式
            </p>
            <p className="mt-1 font-medium" style={{ color: "var(--color-text)" }}>
              {MODE_LABELS[mode] || MODE_LABELS.free}
            </p>
          </div>
        </section>

        <ModeSelector current={mode} onSelect={handleModeChange} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)] xl:items-start">
          <aside className="order-1 xl:order-2 xl:sticky xl:top-20">
            <section
              className="rounded-[28px] border p-4 md:p-5 shadow-theme-md"
              style={{ borderColor: "var(--color-border)", background: "linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 5%, white), var(--color-surface))" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-text-secondary)" }}>
                    Conversation Reader
                  </p>
                  <h3 className="text-lg font-semibold mt-1" style={{ color: "var(--color-text)" }}>
                    对话阅读区
                  </h3>
                  <p className="text-sm mt-2 max-w-xl" style={{ color: "var(--color-text-secondary)" }}>
                    保持更大的固定阅读高度，方便查看推理过程、提示和最终反馈，不再被下方输入控件挤压。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: "color-mix(in srgb, var(--color-primary) 10%, white)", color: "var(--color-primary-dark)" }}
                  >
                    {MODE_LABELS[mode] || MODE_LABELS.free}
                  </span>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: "rgba(15,23,42,0.88)", color: "#fff" }}
                  >
                    {messages.length} 条消息
                  </span>
                </div>
              </div>

              <div
                className="mt-4 rounded-[24px] border p-4 md:p-5 h-[24rem] md:h-[30rem] xl:h-[40rem] overflow-y-auto"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
              >
                {messages.map((msg, i) => (
                  <ChatMessage key={i} role={msg.role} content={msg.content} />
                ))}
                <div ref={bottomRef} />
              </div>
            </section>
          </aside>

          <div className="order-2 xl:order-1 space-y-6">
            <section
              className="rounded-[28px] border p-4 md:p-5 shadow-theme-sm"
              style={{ borderColor: "var(--color-border)", background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 4%, white), color-mix(in srgb, var(--color-accent) 4%, white))" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-text-secondary)" }}>
                    Cognitive Boost
                  </p>
                  <h3 className="text-lg font-semibold mt-1" style={{ color: "var(--color-text)" }}>
                    认知增强实验台
                  </h3>
                  <p className="text-sm mt-2 max-w-2xl" style={{ color: "var(--color-text-secondary)" }}>
                    先选样例或自行输入题目，再在下方整理思路并运行认知增强。结果会进入右侧阅读区，同时生成下方的结构化审计面板。
                  </p>
                </div>
                <div
                  className="rounded-2xl border px-4 py-3 text-xs leading-6"
                  style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.76)", color: "var(--color-text-secondary)" }}
                >
                  先选样例或直接输入
                  <br />
                  再决定是运行认知增强还是普通发送
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3 mt-4">
                {DEMO_PRESETS.map((preset) => (
                  <button
                    key={preset.title}
                    onClick={() => applyPreset(preset)}
                    disabled={streaming || demoLoading}
                    className="text-left rounded-2xl border p-4 transition-transform disabled:opacity-60 hover:-translate-y-0.5"
                    style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.82)" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                        {preset.title}
                      </span>
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px]"
                        style={{ background: "color-mix(in srgb, var(--color-primary) 10%, white)", color: "var(--color-primary-dark)" }}
                      >
                        {preset.badge}
                      </span>
                    </div>
                    <p className="text-xs mt-2 leading-5" style={{ color: "var(--color-text-secondary)" }}>
                      {preset.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            <section
              className="rounded-[28px] border p-4 md:p-5 shadow-theme-sm"
              style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-text-secondary)" }}>
                    Problem Composer
                  </p>
                  <h3 className="text-lg font-semibold mt-1" style={{ color: "var(--color-text)" }}>
                    输入题目与思路
                  </h3>
                  <p className="text-sm mt-2 max-w-2xl" style={{ color: "var(--color-text-secondary)" }}>
                    左侧输入题目，右侧补充你的思路和提示参数。长题目现在使用多行编辑器，支持 `Ctrl/Command + Enter` 快速发送。
                  </p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr] mt-4">
                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "var(--color-border)", background: "color-mix(in srgb, var(--color-primary) 3%, white)" }}
                >
                  <label className="block text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
                    题目 / 问题输入
                  </label>
                  <textarea
                    className="w-full border rounded-2xl px-4 py-3 text-sm leading-7 resize-none focus:outline-none"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)" }}
                    placeholder="把题目、选项、原文句子或想练习的对话场景贴到这里..."
                    rows={6}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    disabled={streaming || demoLoading}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                    <span>适合粘贴长题干、阅读材料、作文题目或口语场景。</span>
                    <span>`Ctrl / Command + Enter` 快速发送</span>
                  </div>
                </div>

                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: "var(--color-border)", background: "color-mix(in srgb, var(--color-accent) 4%, white)" }}
                >
                  <label className="block text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
                    先写下你的思路（反思输入）
                  </label>
                  <textarea
                    className="w-full border rounded-2xl px-4 py-3 text-sm leading-7 resize-none focus:outline-none"
                    style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)" }}
                    placeholder="例如：我现在卡在时态判断，不确定是一般过去时还是现在完成时..."
                    rows={6}
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    disabled={streaming || demoLoading}
                  />

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <select
                      className="border rounded-xl px-3 py-2 text-sm"
                      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)" }}
                      value={guidanceLevel}
                      onChange={(e) => setGuidanceLevel(e.target.value as "socratic" | "mirror" | "hybrid")}
                      disabled={streaming || demoLoading}
                    >
                      <option value="socratic">引导模式：Socratic</option>
                      <option value="mirror">引导模式：Mirror</option>
                      <option value="hybrid">引导模式：Hybrid</option>
                    </select>

                    <div className="flex items-center gap-3 rounded-xl border px-3 py-2" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                      <span className="text-xs shrink-0" style={{ color: "var(--color-text-secondary)" }}>
                        提示预算
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={5}
                        value={hintBudget}
                        onChange={(e) => setHintBudget(Number(e.target.value))}
                        disabled={streaming || demoLoading}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                        {hintBudget}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {(sendError || demoError) && (
                <div
                  className="mt-4 rounded-2xl border px-4 py-3 text-sm"
                  style={{ borderColor: "#fecaca", background: "#fef2f2", color: "#b91c1c" }}
                >
                  {sendError && <p>{sendError}</p>}
                  {demoError && <p>{demoError}</p>}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleRunCognitiveDemo}
                  disabled={streaming || demoLoading}
                  className="px-5 py-2.5 rounded-full text-sm font-medium text-white transition-opacity disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))" }}
                >
                  {demoLoading ? "运行中..." : "运行认知增强"}
                </button>
                <button
                  onClick={handleSend}
                  disabled={streaming || demoLoading}
                  className="px-5 py-2.5 rounded-full text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-primary))" }}
                >
                  {streaming ? "发送中..." : "发送普通问答"}
                </button>
                <p className="text-xs leading-6" style={{ color: "var(--color-text-secondary)" }}>
                  认知增强会优先返回结构化引导和审计结果；普通问答则走原有流式对话链路。
                </p>
              </div>
            </section>
          </div>
        </div>

        <CognitiveAuditPanel result={demoResult} />
      </div>
    </PageTransition>
  );
}
