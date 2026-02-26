"use client";

interface DataPoint {
  date: string;
  score: number;
}

export default function ScoreChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) return null;

  const w = 500, h = 200, px = 40, py = 20;
  const chartW = w - px * 2;
  const chartH = h - py * 2;
  const maxScore = 100;
  const minScore = 0;

  const points = data.map((d, i) => ({
    x: px + (i / Math.max(data.length - 1, 1)) * chartW,
    y: py + chartH - ((d.score - minScore) / (maxScore - minScore)) * chartH,
    ...d,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minWidth: 300 }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => {
          const y = py + chartH - (v / 100) * chartH;
          return (
            <g key={v}>
              <line x1={px} y1={y} x2={w - px} y2={y} stroke="var(--color-border)" strokeWidth="1" opacity="0.5" />
              <text x={px - 8} y={y + 4} textAnchor="end" fill="var(--color-text-secondary)" fontSize="10">{v}</text>
            </g>
          );
        })}

        {/* Line */}
        <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Area fill */}
        <path
          d={`${pathD} L ${points[points.length - 1].x} ${py + chartH} L ${points[0].x} ${py + chartH} Z`}
          fill="var(--color-primary)" opacity="0.1"
        />

        {/* Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="var(--color-primary)" />
            <text x={p.x} y={h - 4} textAnchor="middle" fill="var(--color-text-secondary)" fontSize="9">
              {p.date.slice(5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
