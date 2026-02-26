"use client";

import { useState } from "react";
import { api } from "@/lib/api";

interface WordDetailData {
  phonetic?: string;
  pos?: string;
  definition_en?: string;
  definition_cn?: string;
  etymology?: string;
  collocations?: string[];
  example_sentences?: { en: string; cn: string }[];
  synonyms?: string[];
  antonyms?: string[];
  word_family?: string[];
  memory_tip?: string;
}

export default function WordDetail({ word, onClose }: { word: string; onClose: () => void }) {
  const [data, setData] = useState<WordDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchDetail = async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const res = await api.get<WordDetailData>(`/vocabulary/word-detail/${encodeURIComponent(word)}`);
      setData(res);
      setLoaded(true);
    } catch { /* ignore */ }
    setLoading(false);
  };

  if (!loaded && !loading) fetchDetail();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[80vh] overflow-y-auto rounded-xl border p-5 shadow-xl"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>{word}</h3>
          <button onClick={onClose} className="text-sm" style={{ color: "var(--color-text-secondary)" }}>✕</button>
        </div>

        {loading && <div className="text-sm py-8 text-center" style={{ color: "var(--color-text-secondary)" }}>加载中...</div>}

        {data && (
          <div className="space-y-3">
            {/* Phonetic & POS */}
            <div className="flex items-center gap-3 text-sm">
              {data.phonetic && <span style={{ color: "var(--color-text-secondary)" }}>{data.phonetic}</span>}
              {data.pos && <span className="px-1.5 py-0.5 rounded text-xs" style={{ background: "var(--color-border)", color: "var(--color-text-secondary)" }}>{data.pos}</span>}
            </div>

            {/* Definitions */}
            {data.definition_en && <div className="text-sm" style={{ color: "var(--color-text)" }}>{data.definition_en}</div>}
            {data.definition_cn && <div className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>{data.definition_cn}</div>}

            {/* Etymology */}
            {data.etymology && (
              <div className="rounded-lg p-2.5 text-xs" style={{ background: "var(--color-bg)", color: "var(--color-text-secondary)" }}>
                <span className="font-medium" style={{ color: "var(--color-text)" }}>词源：</span>{data.etymology}
              </div>
            )}

            {/* Example sentences */}
            {data.example_sentences && data.example_sentences.length > 0 && (
              <div>
                <div className="text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>例句</div>
                <div className="space-y-1.5">
                  {data.example_sentences.map((s, i) => (
                    <div key={i} className="text-xs rounded-lg p-2" style={{ background: "var(--color-bg)" }}>
                      <div style={{ color: "var(--color-text)" }}>{s.en}</div>
                      <div style={{ color: "var(--color-text-secondary)" }}>{s.cn}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collocations */}
            {data.collocations && data.collocations.length > 0 && (
              <div>
                <div className="text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>常见搭配</div>
                <div className="flex flex-wrap gap-1">
                  {data.collocations.map((c, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-lg" style={{ background: "var(--color-border)", color: "var(--color-text)" }}>{c}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Synonyms & Antonyms */}
            <div className="flex gap-4">
              {data.synonyms && data.synonyms.length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text)" }}>近义词</div>
                  <div className="flex flex-wrap gap-1">
                    {data.synonyms.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-lg" style={{ background: "#dcfce7", color: "#166534" }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {data.antonyms && data.antonyms.length > 0 && (
                <div>
                  <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text)" }}>反义词</div>
                  <div className="flex flex-wrap gap-1">
                    {data.antonyms.map((a, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-lg" style={{ background: "#fee2e2", color: "#991b1b" }}>{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Word family */}
            {data.word_family && data.word_family.length > 0 && (
              <div>
                <div className="text-xs font-medium mb-1" style={{ color: "var(--color-text)" }}>词族</div>
                <div className="flex flex-wrap gap-1">
                  {data.word_family.map((w, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-lg" style={{ background: "var(--color-border)", color: "var(--color-text)" }}>{w}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Memory tip */}
            {data.memory_tip && (
              <div className="rounded-lg p-2.5 text-xs" style={{ background: "#fef3c7", color: "#92400e" }}>
                <span className="font-medium">记忆技巧：</span>{data.memory_tip}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
