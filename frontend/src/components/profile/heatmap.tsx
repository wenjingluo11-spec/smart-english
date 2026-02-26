"use client";

interface HeatmapDay {
  date: string;
  count: number;
}

export default function Heatmap({ data }: { data: HeatmapDay[] }) {
  if (data.length === 0) return null;

  const cellSize = 14;
  const gap = 3;
  const weeks = Math.ceil(data.length / 7);
  const w = weeks * (cellSize + gap) + 40;
  const h = 7 * (cellSize + gap) + 24;

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const getColor = (count: number) => {
    if (count === 0) return "var(--color-border)";
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.25) return "#86efac";
    if (intensity < 0.5) return "#4ade80";
    if (intensity < 0.75) return "#22c55e";
    return "#16a34a";
  };

  const dayLabels = ["一", "", "三", "", "五", "", "日"];

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} className="block">
        {/* Day labels */}
        {dayLabels.map((label, i) => (
          <text
            key={i}
            x={28}
            y={20 + i * (cellSize + gap) + cellSize / 2 + 3}
            textAnchor="end"
            fill="var(--color-text-secondary)"
            fontSize="9"
          >
            {label}
          </text>
        ))}

        {/* Cells */}
        {data.map((d, i) => {
          const week = Math.floor(i / 7);
          const day = i % 7;
          return (
            <rect
              key={d.date}
              x={36 + week * (cellSize + gap)}
              y={16 + day * (cellSize + gap)}
              width={cellSize}
              height={cellSize}
              rx={3}
              fill={getColor(d.count)}
              opacity={d.count === 0 ? 0.3 : 1}
            >
              <title>{d.date}: {d.count} 题</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}
