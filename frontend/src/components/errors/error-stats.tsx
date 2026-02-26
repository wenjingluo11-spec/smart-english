"use client";

interface ErrorStatsProps {
  stats: {
    total: number;
    unmastered: number;
    mastered: number;
    by_topic: { topic: string; count: number }[];
    by_type: { type: string; count: number }[];
    recent_trend: { date: string; count: number }[];
  };
}

export default function ErrorStatsPanel({ stats }: ErrorStatsProps) {
  const maxTrend = Math.max(...stats.recent_trend.map((d) => d.count), 1);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "总错题", value: stats.total, color: "var(--color-primary)" },
          { label: "未掌握", value: stats.unmastered, color: "#ef4444" },
          { label: "已掌握", value: stats.mastered, color: "#22c55e" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border p-3 text-center" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
            <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 7-day trend */}
      <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
        <h4 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>7 天错题趋势</h4>
        <div className="flex items-end gap-1 h-20">
          {stats.recent_trend.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${Math.max((d.count / maxTrend) * 100, 4)}%`,
                  background: d.count > 0 ? "var(--color-primary)" : "var(--color-border)",
                  opacity: d.count > 0 ? 1 : 0.3,
                }}
              />
              <span className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
                {d.date.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* By topic */}
      {stats.by_topic.length > 0 && (
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
          <h4 className="text-sm font-medium mb-2" style={{ color: "var(--color-text)" }}>按知识点</h4>
          <div className="space-y-1.5">
            {stats.by_topic.slice(0, 5).map((t) => (
              <div key={t.topic} className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--color-text)" }}>{t.topic}</span>
                <span className="font-medium" style={{ color: "var(--color-primary)" }}>{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By type */}
      {stats.by_type.length > 0 && (
        <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
          <h4 className="text-sm font-medium mb-2" style={{ color: "var(--color-text)" }}>按题型</h4>
          <div className="space-y-1.5">
            {stats.by_type.map((t) => (
              <div key={t.type} className="flex items-center justify-between text-xs">
                <span style={{ color: "var(--color-text)" }}>{t.type}</span>
                <span className="font-medium" style={{ color: "var(--color-primary)" }}>{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
