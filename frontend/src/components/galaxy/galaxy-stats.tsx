"use client";

interface Props {
  stats: {
    total_nodes: number;
    undiscovered: number;
    seen: number;
    familiar: number;
    mastered: number;
    progress_pct: number;
  };
}

export default function GalaxyStats({ stats }: Props) {
  return (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#6b7280" }} />
        <span style={{ color: "var(--color-text-secondary)" }}>未发现 {stats.undiscovered}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#60a5fa" }} />
        <span style={{ color: "var(--color-text-secondary)" }}>已见 {stats.seen}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#fbbf24" }} />
        <span style={{ color: "var(--color-text-secondary)" }}>熟悉 {stats.familiar}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#34d399" }} />
        <span style={{ color: "var(--color-text-secondary)" }}>掌握 {stats.mastered}</span>
      </div>
      <div className="font-medium" style={{ color: "var(--color-primary)" }}>
        {stats.progress_pct}%
      </div>
    </div>
  );
}
