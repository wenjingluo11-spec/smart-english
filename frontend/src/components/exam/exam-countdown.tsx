export default function ExamCountdown({ days }: { days: number | null }) {
  return (
    <div className="p-4 rounded-2xl text-center" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
      <p className="text-xs mb-1" style={{ color: "var(--color-text-secondary)" }}>距离考试</p>
      <div className="text-3xl font-bold" style={{ color: days !== null && days < 30 ? "#ef4444" : "var(--color-primary)" }}>
        {days !== null ? days : "--"}
      </div>
      <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>天</p>
    </div>
  );
}
