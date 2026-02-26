"use client";

export default function LevelBadge({ level, xp, xpForNext }: { level: number; xp: number; xpForNext: number }) {
  const xpForCurrent = level * level * 50;
  const progress = xpForNext > xpForCurrent ? ((xp - xpForCurrent) / (xpForNext - xpForCurrent)) * 100 : 100;
  const r = 16;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative w-10 h-10 flex items-center justify-center" title={`Level ${level} · ${xp}/${xpForNext} XP`}>
      <svg width="40" height="40" className="absolute -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="var(--color-border)" strokeWidth="3" />
        <circle
          cx="20" cy="20" r={r} fill="none"
          stroke="var(--color-primary)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <span className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>{level}</span>
    </div>
  );
}
