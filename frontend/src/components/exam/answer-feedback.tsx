import AudioPlayer from "@/components/cognitive/AudioPlayer";
import SyncReader from "@/components/cognitive/SyncReader";
import ExpertDemo from "@/components/cognitive/ExpertDemo";
import TextHighlighter, { type Highlight } from "@/components/cognitive/TextHighlighter";

interface AnswerFeedbackProps {
  feedback: Record<string, unknown>;
  /** V2: 题目ID，用于加载学霸审题演示 */
  questionId?: number;
  /** V2: 题目原文，用于视听同步跟读 */
  questionContent?: string;
  /** V2: 题目来源 */
  source?: "practice" | "exam";
}

export default function AnswerFeedback({ feedback, questionId, questionContent, source = "exam" }: AnswerFeedbackProps) {
  const isCorrect = feedback.is_correct as boolean;
  const correctAnswer = feedback.correct_answer as string;
  const explanation = feedback.explanation as string;
  const strategyTip = feedback.strategy_tip as string | undefined;
  const knowledgePoint = feedback.knowledge_point as string | undefined;
  const masteryBefore = feedback.mastery_before as number | undefined;
  const masteryAfter = feedback.mastery_after as number | undefined;

  // 认知增强字段
  const howToSpot = feedback.how_to_spot as string | undefined;
  const keyClues = feedback.key_clues as { text: string; role: string }[] | undefined;
  const commonTrap = feedback.common_trap as string | undefined;
  const method = feedback.method as string | undefined;
  const analysis = feedback.analysis as {
    key_phrases: { text: string; role: string; importance: string; hint: string }[];
    reading_order: { step: number; target: string; action: string; reason: string }[];
    strategy: string;
    distractors: { option: string; trap: string }[];
  } | undefined;

  return (
    <div className="space-y-3">
      {/* 对错判定 */}
      <div className="p-4 rounded-2xl space-y-3" style={{
        background: isCorrect ? "#f0fdf4" : "#fef2f2",
        border: `1px solid ${isCorrect ? "#bbf7d0" : "#fecaca"}`,
      }}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{isCorrect ? "\u2705" : "\u274c"}</span>
          <span className="font-medium" style={{ color: isCorrect ? "#16a34a" : "#dc2626" }}>
            {isCorrect ? "\u56de\u7b54\u6b63\u786e\uff01" : "\u56de\u7b54\u9519\u8bef"}
          </span>
        </div>

        {!isCorrect && correctAnswer && (
          <p className="text-sm" style={{ color: "#374151" }}>
            \u6b63\u786e\u7b54\u6848\uff1a<span className="font-medium">{correctAnswer}</span>
          </p>
        )}

        {knowledgePoint && (
          <p className="text-xs" style={{ color: "#6b7280" }}>\ud83d\udccc \u77e5\u8bc6\u70b9\uff1a{knowledgePoint}</p>
        )}

        {masteryBefore !== undefined && masteryAfter !== undefined && (
          <div className="flex items-center gap-2 text-xs" style={{ color: "#6b7280" }}>
            <span>\u638c\u63e1\u5ea6</span>
            <span>{Math.round(masteryBefore * 100)}%</span>
            <span>\u2192</span>
            <span style={{ color: masteryAfter > masteryBefore ? "#16a34a" : masteryAfter < masteryBefore ? "#dc2626" : "#6b7280", fontWeight: 500 }}>
              {Math.round(masteryAfter * 100)}%
            </span>
            {masteryAfter > masteryBefore && <span>\ud83d\udcc8</span>}
          </div>
        )}
      </div>

      {/* 学霸审题思路 */}
      {howToSpot && (
        <div className="p-4 rounded-xl"
          style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold" style={{ color: "#2563eb" }}>\ud83c\udfaf \u5b66\u9738\u600e\u4e48\u770b\u7684</span>
            <AudioPlayer text={howToSpot} compact label="\u542c" />
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>{howToSpot}</p>
        </div>
      )}

      {/* 关键线索：在原文中高亮标记 */}
      {keyClues && keyClues.length > 0 && questionContent && (
        <div className="p-4 rounded-xl" style={{ background: "var(--color-surface-hover, #f9fafb)" }}>
          <div className="text-xs font-semibold mb-2" style={{ color: "#6b7280" }}>关键线索（原文标记）</div>
          <TextHighlighter
            text={questionContent}
            highlights={buildHighlightsFromClues(questionContent, keyClues, analysis)}
          />
        </div>
      )}

      {/* 关键线索：文字列表（无原文时或作为补充） */}
      {keyClues && keyClues.length > 0 && !questionContent && (
        <div className="p-4 rounded-xl" style={{ background: "var(--color-surface-hover, #f9fafb)" }}>
          <div className="text-xs font-semibold mb-2" style={{ color: "#6b7280" }}>关键线索</div>
          <div className="space-y-1.5">
            {keyClues.map((clue, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-blue-500 mt-0.5 shrink-0">&#x25B8;</span>
                <span>
                  <span className="font-medium" style={{ color: "#2563eb" }}>{clue.text}</span>
                  <span className="mx-1" style={{ color: "#9ca3af" }}>—</span>
                  <span style={{ color: "#6b7280" }}>{clue.role}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 常见陷阱 + 解题方法 */}
      {(commonTrap || method) && (
        <div className="flex gap-3 flex-wrap">
          {commonTrap && (
            <div className="flex-1 min-w-[180px] p-3 rounded-xl text-sm"
              style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
              <div className="text-xs font-semibold mb-1" style={{ color: "#d97706" }}>\u5e38\u89c1\u9677\u9631</div>
              <div style={{ color: "#374151" }}>{commonTrap}</div>
            </div>
          )}
          {method && (
            <div className="flex-1 min-w-[180px] p-3 rounded-xl text-sm"
              style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
              <div className="text-xs font-semibold mb-1" style={{ color: "#059669" }}>\u89e3\u9898\u65b9\u6cd5</div>
              <div style={{ color: "#374151" }}>{method}</div>
            </div>
          )}
        </div>
      )}

      {/* 审题顺序 */}
      {analysis?.reading_order && analysis.reading_order.length > 0 && (
        <div className="p-4 rounded-xl" style={{ background: "var(--color-surface-hover, #f9fafb)" }}>
          <div className="text-xs font-semibold mb-2" style={{ color: "#6b7280" }}>\u5ba1\u9898\u987a\u5e8f</div>
          <div className="space-y-2">
            {analysis.reading_order.map((step) => (
              <div key={step.step} className="flex items-start gap-2 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
                  {step.step}
                </span>
                <div>
                  <span className="font-medium" style={{ color: "#374151" }}>{step.target}</span>
                  <span className="mx-1" style={{ color: "#9ca3af" }}>\u2192</span>
                  <span style={{ color: "#6b7280" }}>{step.action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* V2: 视听同步跟读 */}
      {questionContent && (
        <SyncReader text={questionContent} className="px-4" />
      )}

      {/* V2: 学霸审题演示 */}
      {questionId && questionContent && (
        <ExpertDemo
          questionText={questionContent}
          questionId={questionId}
          source={source}
        />
      )}

      {/* 策略提示（原有） */}
      {strategyTip && (
        <p className="text-xs px-4" style={{ color: "#6b7280" }}>\ud83d\udca1 {strategyTip}</p>
      )}

      {/* 传统解析折叠 */}
      {explanation && !howToSpot && (
        <p className="text-sm leading-relaxed px-4" style={{ color: "#374151" }}>{explanation}</p>
      )}
    </div>
  );
}

/** 从 key_clues 和 analysis 构建 TextHighlighter 所需的 Highlight 数组 */
function buildHighlightsFromClues(
  questionContent: string,
  keyClues: { text: string; role: string }[],
  analysis?: {
    key_phrases: { text: string; role: string; importance: string; hint: string }[];
    reading_order: { step: number; target: string; action: string; reason: string }[];
    strategy: string;
    distractors: { option: string; trap: string }[];
  },
): Highlight[] {
  const highlights: Highlight[] = [];

  for (const clue of keyClues) {
    const idx = questionContent.indexOf(clue.text);
    if (idx < 0) continue;
    const type = clue.role === "signal_word" || clue.role === "信号词" ? "signal_word"
      : clue.role === "context_clue" || clue.role === "上下文线索" ? "clue"
      : clue.role === "key_info" || clue.role === "关键信息" ? "key_phrase"
      : "key_phrase";
    highlights.push({
      text: clue.text,
      start: idx,
      end: idx + clue.text.length,
      type: type as Highlight["type"],
      label: clue.role,
    });
  }

  // 从 analysis.key_phrases 补充题眼
  if (analysis?.key_phrases) {
    for (const kp of analysis.key_phrases) {
      if (highlights.some((h) => h.text === kp.text)) continue;
      const idx = questionContent.indexOf(kp.text);
      if (idx < 0) continue;
      const type = kp.role === "signal_word" ? "signal_word"
        : kp.role === "context_clue" ? "clue"
        : kp.role === "key_info" ? "key_phrase"
        : "key_phrase";
      highlights.push({
        text: kp.text,
        start: idx,
        end: idx + kp.text.length,
        type: type as Highlight["type"],
        label: kp.hint || kp.role,
      });
    }
  }

  return highlights;
}
