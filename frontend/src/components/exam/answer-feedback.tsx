export default function AnswerFeedback({ feedback }: { feedback: Record<string, unknown> }) {
  const isCorrect = feedback.is_correct as boolean;
  const correctAnswer = feedback.correct_answer as string;
  const explanation = feedback.explanation as string;
  const strategyTip = feedback.strategy_tip as string | undefined;
  const knowledgePoint = feedback.knowledge_point as string | undefined;
  const masteryBefore = feedback.mastery_before as number | undefined;
  const masteryAfter = feedback.mastery_after as number | undefined;
  const strategyChoice = feedback.strategy_choice as string | undefined;
  const reflectionText = feedback.reflection_text as string | undefined;
  const reasoningQuality = feedback.reasoning_quality_score as number | undefined;
  const reasoningDelta = feedback.reasoning_quality_delta as number | undefined;

  return (
    <div className="p-4 rounded-2xl space-y-3" style={{
      background: isCorrect ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${isCorrect ? "#bbf7d0" : "#fecaca"}`,
    }}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{isCorrect ? "✅" : "❌"}</span>
        <span className="font-medium" style={{ color: isCorrect ? "#16a34a" : "#dc2626" }}>
          {isCorrect ? "回答正确！" : "回答错误"}
        </span>
      </div>

      {!isCorrect && correctAnswer && (
        <p className="text-sm" style={{ color: "#374151" }}>
          正确答案：<span className="font-medium">{correctAnswer}</span>
        </p>
      )}

      {explanation && (
        <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>{explanation}</p>
      )}

      {strategyTip && (
        <p className="text-xs" style={{ color: "#6b7280" }}>💡 {strategyTip}</p>
      )}

      {strategyChoice && (
        <p className="text-xs" style={{ color: "#6b7280" }}>🧭 作答策略：{strategyChoice}</p>
      )}

      {reflectionText && (
        <p className="text-xs leading-relaxed" style={{ color: "#6b7280" }}>🪞 自解释：{reflectionText}</p>
      )}

      {reasoningQuality !== undefined && (
        <div className="text-xs" style={{ color: "#6b7280" }}>
          推理质量：{Math.round(reasoningQuality * 100)}%
          {reasoningDelta !== undefined && (
            <span style={{ color: reasoningDelta >= 0 ? "#16a34a" : "#dc2626", marginLeft: 8 }}>
              {reasoningDelta >= 0 ? "↑" : "↓"} {Math.round(Math.abs(reasoningDelta) * 100)}%
            </span>
          )}
        </div>
      )}

      {knowledgePoint && (
        <p className="text-xs" style={{ color: "#6b7280" }}>📌 知识点：{knowledgePoint}</p>
      )}

      {masteryBefore !== undefined && masteryAfter !== undefined && (
        <div className="flex items-center gap-2 text-xs" style={{ color: "#6b7280" }}>
          <span>掌握度</span>
          <span>{Math.round(masteryBefore * 100)}%</span>
          <span>→</span>
          <span style={{ color: masteryAfter > masteryBefore ? "#16a34a" : masteryAfter < masteryBefore ? "#dc2626" : "#6b7280", fontWeight: 500 }}>
            {Math.round(masteryAfter * 100)}%
          </span>
          {masteryAfter > masteryBefore && <span>📈</span>}
        </div>
      )}
    </div>
  );
}
