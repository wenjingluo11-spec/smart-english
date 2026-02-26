"use client";

import { useEffect, useState } from "react";
import { useTextbookStore } from "@/stores/textbook";
import PageTransition from "@/components/ui/page-transition";
import Skeleton from "@/components/ui/skeleton";

export default function TextbookPage() {
  const {
    textbooks, units, currentTextbook, currentUnitId, unitDetail, loading,
    fetchTextbooks, fetchUnits, fetchUnitDetail, fetchMySetting, saveSetting,
  } = useTextbookStore();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);

  useEffect(() => {
    fetchMySetting();
    fetchTextbooks();
  }, [fetchMySetting, fetchTextbooks]);

  useEffect(() => {
    if (currentUnitId) {
      fetchUnitDetail(currentUnitId);
      setSelectedUnitId(currentUnitId);
    }
  }, [currentUnitId, fetchUnitDetail]);

  const handleSelectTextbook = async (id: number) => {
    await saveSetting(id);
    setShowPicker(false);
  };

  const handleSelectUnit = (unitId: number) => {
    setSelectedUnitId(unitId);
    fetchUnitDetail(unitId);
    saveSetting(currentTextbook!.id, unitId);
  };

  return (
    <PageTransition stagger>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{ color: "var(--color-text)" }}>教材同步</h2>
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="text-xs px-3 py-1.5 rounded-lg border"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
          >
            {currentTextbook ? "切换教材" : "选择教材"}
          </button>
        </div>

        {/* Current textbook info */}
        {currentTextbook && (
          <div className="rounded-xl border p-4 mb-4 flex items-center gap-3" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
            <div className="w-10 h-14 rounded bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {currentTextbook.grade.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{currentTextbook.name}</div>
              <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {currentTextbook.publisher} · {currentTextbook.grade}{currentTextbook.semester}
              </div>
            </div>
          </div>
        )}

        {/* Textbook picker */}
        {showPicker && (
          <div className="rounded-xl border p-4 mb-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>选择教材</h3>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : textbooks.length === 0 ? (
              <div className="text-sm text-center py-4" style={{ color: "var(--color-text-secondary)" }}>暂无教材数据</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {textbooks.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleSelectTextbook(b.id)}
                    className={`text-left p-3 rounded-lg border transition-all hover:shadow-sm ${
                      currentTextbook?.id === b.id ? "border-2" : ""
                    }`}
                    style={{
                      borderColor: currentTextbook?.id === b.id ? "var(--color-primary)" : "var(--color-border)",
                      background: currentTextbook?.id === b.id ? "var(--color-primary-light, #dbeafe)" : "transparent",
                    }}
                  >
                    <div className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{b.name}</div>
                    <div className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>{b.publisher}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Units + Detail layout */}
        {currentTextbook && (
          <div className="flex gap-4">
            {/* Unit list */}
            <div className="w-48 shrink-0 space-y-1">
              {units.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelectUnit(u.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedUnitId === u.id ? "font-medium" : ""
                  }`}
                  style={{
                    background: selectedUnitId === u.id ? "var(--color-primary-light, #dbeafe)" : "transparent",
                    color: selectedUnitId === u.id ? "var(--color-primary)" : "var(--color-text)",
                  }}
                >
                  <div>Unit {u.unit_number}</div>
                  <div className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>{u.title}</div>
                </button>
              ))}
            </div>

            {/* Unit detail */}
            <div className="flex-1 min-w-0">
              {unitDetail ? (
                <div className="space-y-4">
                  <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                    <h3 className="text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>
                      Unit {unitDetail.unit_number}: {unitDetail.title}
                    </h3>
                    {unitDetail.topic && (
                      <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>主题：{unitDetail.topic}</div>
                    )}
                  </div>

                  {/* Vocabulary */}
                  {unitDetail.vocabulary.length > 0 && (
                    <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                      <h4 className="text-sm font-medium mb-2" style={{ color: "var(--color-text)" }}>
                        单词 ({unitDetail.vocabulary.length})
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {unitDetail.vocabulary.map((w, i) => (
                          <span key={i} className="text-xs px-2 py-1 rounded-lg" style={{ background: "var(--color-border)", color: "var(--color-text)" }}>
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grammar points */}
                  {unitDetail.grammar_points.length > 0 && (
                    <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                      <h4 className="text-sm font-medium mb-2" style={{ color: "var(--color-text)" }}>
                        语法点 ({unitDetail.grammar_points.length})
                      </h4>
                      <ul className="space-y-1.5">
                        {unitDetail.grammar_points.map((g, i) => (
                          <li key={i} className="text-xs flex items-start gap-2" style={{ color: "var(--color-text)" }}>
                            <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-medium text-white shrink-0 mt-0.5" style={{ background: "var(--color-primary)" }}>
                              {i + 1}
                            </span>
                            {g}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Key sentences */}
                  {unitDetail.key_sentences.length > 0 && (
                    <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                      <h4 className="text-sm font-medium mb-2" style={{ color: "var(--color-text)" }}>
                        重点句型 ({unitDetail.key_sentences.length})
                      </h4>
                      <div className="space-y-2">
                        {unitDetail.key_sentences.map((s, i) => (
                          <div key={i} className="text-xs p-2 rounded-lg" style={{ background: "var(--color-border)", color: "var(--color-text)" }}>
                            {s}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 rounded-xl border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                  <div className="text-3xl mb-2">📖</div>
                  <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>选择一个单元查看详情</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No textbook selected */}
        {!currentTextbook && !showPicker && (
          <div className="text-center py-16 rounded-xl border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
            <div className="text-4xl mb-3">📚</div>
            <div className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>还没有选择教材</div>
            <button
              onClick={() => setShowPicker(true)}
              className="text-sm px-4 py-2 rounded-lg text-white"
              style={{ background: "var(--color-primary)" }}
            >
              选择教材
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
