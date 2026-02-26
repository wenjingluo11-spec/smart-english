"use client";

import Link from "next/link";

const modules = [
  { id: "practice", label: "智能题库", href: "/practice", cardClass: "card-gradient-practice", icon: "📝" },
  { id: "reading", label: "阅读训练", href: "/reading", cardClass: "card-gradient-reading", icon: "📖" },
  { id: "writing", label: "写作批改", href: "/writing", cardClass: "card-gradient-writing", icon: "✍️" },
  { id: "vocabulary", label: "词汇系统", href: "/vocabulary", cardClass: "card-gradient-vocab", icon: "📚" },
  { id: "tutor", label: "AI 导师", href: "/tutor", cardClass: "card-gradient-tutor", icon: "🤖" },
  { id: "exam", label: "考试冲刺", href: "/exam", cardClass: "card-gradient-exam", icon: "⭐" },
];

export default function ConstellationMap() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {modules.map((m, i) => (
        <Link
          key={m.id}
          href={m.href}
          className={`${m.cardClass} p-4 flex flex-col items-center gap-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-theme-md animate-slide-up`}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <span className="text-2xl">{m.icon}</span>
          <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{m.label}</span>
        </Link>
      ))}
    </div>
  );
}
