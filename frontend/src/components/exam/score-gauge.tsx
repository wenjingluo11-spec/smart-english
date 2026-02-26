export default function ScoreGauge({ label, score, max, color }: { label: string; score: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (score / max) * 100) : 0;
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="p-4 rounded-2xl text-center" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
      <p className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>{label}</p>
      <div className="relative inline-block">
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={r} fill="none" stroke="var(--color-border)" strokeWidth="8" />
          <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" transform="rotate(-90 48 48)"
            style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>满分 {max}</p>
    </div>
  );
}
