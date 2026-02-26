"use client";

interface DayData {
  date: string;
  total: number;
  correct: number;
  rate: number;
}

export default function AccuracyChart({ data }: { data: DayData[] }) {
  if (data.length === 0) return null;

  const w = 400, h = 180, px = 36, py = 16;
  const chartW = w - px * 2;
  const chartH = h - py * 2;

  const points = data.map((d, i) => ({
    x: px + (i / Math.max(data.length - 1, 1)) * chartW,
    y: py + chartH - (d.rate / 100) * chartH,
    ...d,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
      {[0, 50, 100].map((v) => {
        const y = py + chartH - (v / 100) * chartH;
        return (
          <g key={v}>
            <line x1={px} y1={y} x2={w - px} y2={y} stroke="var(--color-border)" strokeWidth="1" opacity="0.4" />
            <text x={px - 6} y={y + 3} textAnchor="end" fill="var(--color-text-secondary)" fontSize="9">{v}%</text>
          </g>
        );
      })}
      <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d={`${pathD} L ${points[points.length - 1].x} ${py + chartH} L ${points[0].x} ${py + chartH} Z`}
        fill="var(--color-primary)" opacity="0.08"
      />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth="2" />
          <text x={p.x} y={h - 2} textAnchor="middle" fill="var(--color-text-secondary)" fontSize="8">
            {p.date.slice(5)}
          </text>
        </g>
      ))}
    </svg>
  );
}
