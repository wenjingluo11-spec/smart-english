"use client";

interface Props {
  analysis: {
    vocabulary?: { word: string; pos: string; meaning: string; example: string }[];
    grammar_points?: { point: string; explanation: string; example: string }[];
    cultural_notes?: { note: string }[];
  };
  imageUrl: string;
}

export default function AnalysisResult({ analysis, imageUrl }: Props) {
  const { vocabulary = [], grammar_points = [], cultural_notes = [] } = analysis;

  return (
    <div className="space-y-4">
      {/* Vocabulary */}
      {vocabulary.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <h3 className="font-semibold mb-3" style={{ color: "var(--color-text)" }}>📚 词汇</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {vocabulary.map((v, i) => (
              <div key={i} className="p-3 rounded-lg" style={{ background: "var(--color-bg)" }}>
                <div className="flex items-baseline gap-2">
                  <span className="font-medium" style={{ color: "var(--color-primary)" }}>{v.word}</span>
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{v.pos}</span>
                </div>
                <p className="text-sm mt-1" style={{ color: "var(--color-text)" }}>{v.meaning}</p>
                <p className="text-xs mt-1 italic" style={{ color: "var(--color-text-secondary)" }}>{v.example}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grammar Points */}
      {grammar_points.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <h3 className="font-semibold mb-3" style={{ color: "var(--color-text)" }}>📝 语法点</h3>
          <div className="space-y-3">
            {grammar_points.map((g, i) => (
              <div key={i} className="p-3 rounded-lg" style={{ background: "var(--color-bg)" }}>
                <p className="font-medium text-sm" style={{ color: "var(--color-primary)" }}>{g.point}</p>
                <p className="text-sm mt-1" style={{ color: "var(--color-text)" }}>{g.explanation}</p>
                <p className="text-xs mt-1 italic" style={{ color: "var(--color-text-secondary)" }}>{g.example}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cultural Notes */}
      {cultural_notes.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <h3 className="font-semibold mb-3" style={{ color: "var(--color-text)" }}>🌍 文化注释</h3>
          <div className="space-y-2">
            {cultural_notes.map((c, i) => (
              <p key={i} className="text-sm" style={{ color: "var(--color-text)" }}>• {c.note}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
