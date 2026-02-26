"use client";

import { useStoryStore } from "@/stores/story";

interface Props {
  template: {
    id: number; title: string; genre: string; cefr_min: string; cefr_max: string;
    synopsis: string; cover_emoji: string;
  };
}

const GENRE_LABELS: Record<string, string> = {
  mystery: "悬疑", scifi: "科幻", campus: "校园", fantasy: "奇幻", detective: "侦探",
};

export default function TemplateCard({ template }: Props) {
  const { startStory, loading } = useStoryStore();

  return (
    <div className="rounded-xl p-5 flex flex-col" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
      <div className="text-4xl mb-3">{template.cover_emoji}</div>
      <h3 className="font-semibold" style={{ color: "var(--color-text)" }}>{template.title}</h3>
      <div className="flex gap-2 mt-2">
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
          {GENRE_LABELS[template.genre] || template.genre}
        </span>
        <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--color-bg)", color: "var(--color-text-secondary)" }}>
          {template.cefr_min}-{template.cefr_max}
        </span>
      </div>
      <p className="text-sm mt-3 flex-1" style={{ color: "var(--color-text-secondary)" }}>{template.synopsis}</p>
      <button
        onClick={() => startStory(template.id)}
        disabled={loading}
        className="mt-4 w-full py-2 rounded-lg text-white text-sm font-medium"
        style={{ background: "var(--color-primary)", opacity: loading ? 0.6 : 1 }}
      >
        {loading ? "生成中..." : "开始冒险"}
      </button>
    </div>
  );
}
