"use client";

interface ModeSelectorProps {
  current: string;
  onSelect: (mode: string) => void;
}

const MODES = [
  { key: "free", icon: "💬", label: "自由对话", desc: "通用英语导师，自由提问" },
  { key: "grammar", icon: "🔬", label: "语法诊所", desc: "专注语法纠错和解释" },
  { key: "speaking", icon: "🎭", label: "口语场景", desc: "角色扮演对话练习" },
  { key: "explain", icon: "📝", label: "题目讲解", desc: "粘贴题目获取详细解析" },
];

export default function ModeSelector({ current, onSelect }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      {MODES.map((m) => {
        const active = current === m.key;
        return (
          <button
            key={m.key}
            onClick={() => onSelect(m.key)}
            className="rounded-xl p-3 text-center border transition-all"
            style={{
              borderColor: active ? "var(--color-primary)" : "var(--color-border)",
              background: active ? "var(--color-primary-light, #dbeafe)" : "var(--color-surface)",
            }}
          >
            <div className="text-xl mb-1">{m.icon}</div>
            <div className="text-xs font-medium" style={{ color: active ? "var(--color-primary)" : "var(--color-text)" }}>
              {m.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
