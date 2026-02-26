"use client";

import CountUp from "@/components/ui/count-up";

interface StatOrbitProps {
  todayPractice: number;
  streakDays: number;
  vocabRate: number;
}

const stats = [
  { key: "practice", label: "今日练习", suffix: " 题", max: 10, gradient: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(6,182,212,0.08))", border: "rgba(59,130,246,0.2)", barColor: "linear-gradient(90deg, #3b82f6, #06b6d4)" },
  { key: "streak", label: "连续天数", suffix: " 天", max: 30, gradient: "linear-gradient(135deg, rgba(249,115,22,0.1), rgba(234,179,8,0.08))", border: "rgba(249,115,22,0.2)", barColor: "linear-gradient(90deg, #f97316, #eab308)" },
  { key: "vocab", label: "词汇掌握率", suffix: "%", max: 100, gradient: "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(132,204,22,0.08))", border: "rgba(34,197,94,0.2)", barColor: "linear-gradient(90deg, #22c55e, #84cc16)" },
];

export default function StatOrbit({ todayPractice, streakDays, vocabRate }: StatOrbitProps) {
  const values = [todayPractice, streakDays, vocabRate];

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {stats.map((s, i) => {
        const value = values[i];
        const progress = s.max > 0 ? Math.min(value / s.max, 1) : 0;
        return (
          <div
            key={s.key}
            className="rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 shadow-theme-sm hover:shadow-theme-md"
            style={{ background: s.gradient, border: `1px solid ${s.border}` }}
          >
            <div className="text-caption mb-1">{s.label}</div>
            <div className="text-hero" style={{ color: "var(--color-text)" }}>
              <CountUp end={value} /><span className="text-sm font-normal" style={{ color: "var(--color-text-secondary)" }}>{s.suffix}</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.06)" }}>
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${progress * 100}%`, background: s.barColor }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
