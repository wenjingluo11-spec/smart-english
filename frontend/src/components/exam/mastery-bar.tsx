export default function MasteryBar({ mastery, height = 6 }: { mastery: number; height?: number }) {
  const pct = Math.round(mastery * 100);
  const color = pct >= 85 ? "#22c55e" : pct >= 60 ? "var(--color-primary)" : pct >= 30 ? "#f59e0b" : "#ef4444";

  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: "var(--color-border)" }}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(2, pct)}%`, background: color }}
      />
    </div>
  );
}
