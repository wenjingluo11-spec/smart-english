"use client";

export interface CognitiveDemoResult {
  session_id: number;
  stage: string;
  focus_area: string;
  mirror_level: string;
  zpd_band: string;
  direct_answer_blocked: boolean;
  diversion_message?: string | null;
  tqi_before: number;
  tqi_after: number;
  cognitive_gain: number;
  offload_risk_before: number;
  offload_risk_after: number;
  audit: {
    strengths: string[];
    blind_spots: string[];
    missing_evidence: string[];
    next_action: string;
  };
  comparison: {
    draft: string;
    refined: string;
    delta_tags: string[];
  };
  socratic_questions: string[];
  coach_response: string;
}

/** 将浮点分数转换成百分比展示，便于对比前后变化。 */
function toPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

/** 将 ZPD 分段转换为更容易理解的中文标签。 */
function zpdLabel(band: string) {
  if (band === "easy") return "偏易";
  if (band === "hard") return "偏难";
  return "甜蜜区";
}

/** 展示认知增强 demo 的结构化审计结果。 */
export default function CognitiveAuditPanel({ result }: { result: CognitiveDemoResult | null }) {
  if (!result) return null;

  return (
    <section className="mb-4 rounded-3xl border overflow-hidden shadow-theme-md" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
      <div
        className="p-5"
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 14%, white), color-mix(in srgb, var(--color-accent) 12%, white))",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-text-secondary)" }}>
              Cognitive Mirror Lab
            </p>
            <h3 className="text-xl font-semibold mt-1" style={{ color: "var(--color-text)" }}>
              认知增强回合已生成
            </h3>
            <p className="text-sm mt-2 max-w-2xl" style={{ color: "var(--color-text-secondary)" }}>
              本轮没有直接替你完成答案，而是把你的草稿拆成可验证的证据链和追问路径。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(255,255,255,0.72)", color: "var(--color-primary-dark)" }}>
              镜像层级 {result.mirror_level}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(255,255,255,0.72)", color: "var(--color-primary-dark)" }}>
              ZPD {zpdLabel(result.zpd_band)}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(15,23,42,0.88)", color: "#fff" }}>
              {result.focus_area}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          {[
            { label: "草稿 TQI", value: toPercent(result.tqi_before), tone: "#64748b" },
            { label: "引导后 TQI", value: toPercent(result.tqi_after), tone: "var(--color-primary)" },
            { label: "认知增益", value: `+${toPercent(result.cognitive_gain)}`, tone: "#0f766e" },
            { label: "卸载风险下降", value: `${toPercent(result.offload_risk_before - result.offload_risk_after)}`, tone: "#b45309" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.78)" }}>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{item.label}</p>
              <p className="text-2xl font-semibold mt-1" style={{ color: item.tone }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {result.direct_answer_blocked && result.diversion_message && (
          <div className="rounded-2xl border p-4" style={{ borderColor: "#f59e0b", background: "color-mix(in srgb, #f59e0b 10%, white)" }}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "#92400e" }}>
              设计摩擦已触发
            </p>
            <p className="text-sm mt-2" style={{ color: "#78350f" }}>
              {result.diversion_message}
            </p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1.1fr_0.8fr]">
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "color-mix(in srgb, var(--color-primary) 4%, white)" }}>
            <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--color-text-secondary)" }}>
              我的原始思路
            </p>
            <p className="text-sm leading-7 mt-3 whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
              {result.comparison.draft}
            </p>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "color-mix(in srgb, var(--color-accent) 5%, white)" }}>
            <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--color-text-secondary)" }}>
              结构化后的思考
            </p>
            <p className="text-sm leading-7 mt-3 whitespace-pre-wrap" style={{ color: "var(--color-text)" }}>
              {result.comparison.refined}
            </p>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
            <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--color-text-secondary)" }}>
              审计增量
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {result.comparison.delta_tags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full text-xs" style={{ background: "color-mix(in srgb, var(--color-primary) 10%, white)", color: "var(--color-primary-dark)" }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
            <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--color-text-secondary)" }}>
              你已经做对的
            </p>
            <div className="space-y-2 mt-3">
              {result.audit.strengths.map((item) => (
                <p key={item} className="text-sm leading-6" style={{ color: "var(--color-text)" }}>
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
            <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--color-text-secondary)" }}>
              当前盲点
            </p>
            <div className="space-y-2 mt-3">
              {result.audit.blind_spots.map((item) => (
                <p key={item} className="text-sm leading-6" style={{ color: "var(--color-text)" }}>
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
            <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--color-text-secondary)" }}>
              还缺的证据
            </p>
            <div className="space-y-2 mt-3">
              {result.audit.missing_evidence.map((item) => (
                <p key={item} className="text-sm leading-6" style={{ color: "var(--color-text)" }}>
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: "var(--color-border)", background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 4%, white), white)" }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--color-text-secondary)" }}>
                苏格拉底追问
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
                系统不先给答案，而是先逼你把判断变成可验证推理。
              </p>
            </div>
            <div className="text-sm font-medium" style={{ color: "var(--color-primary-dark)" }}>
              下一步：{result.audit.next_action}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3 mt-4">
            {result.socratic_questions.map((question, index) => (
              <div key={question} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.82)", border: "1px solid var(--color-border)" }}>
                <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "var(--color-text-secondary)" }}>
                  Question {index + 1}
                </p>
                <p className="text-sm leading-6 mt-2" style={{ color: "var(--color-text)" }}>
                  {question}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
