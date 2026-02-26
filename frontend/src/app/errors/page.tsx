"use client";

import { useEffect, useState } from "react";
import { useErrorsStore } from "@/stores/errors";
import ErrorCard from "@/components/errors/error-card";
import ErrorStatsPanel from "@/components/errors/error-stats";
import PageTransition from "@/components/ui/page-transition";
import Skeleton from "@/components/ui/skeleton";

const tabs = [
  { key: "", label: "全部" },
  { key: "unmastered", label: "未掌握" },
  { key: "mastered", label: "已掌握" },
];

export default function ErrorsPage() {
  const {
    entries, total, page, pageSize, filter, stats, loading,
    fetchErrors, fetchStats, setFilter, setPage, retryError, markMastered, deleteError,
  } = useErrorsStore();
  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    fetchErrors();
    fetchStats();
  }, [fetchErrors, fetchStats]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setFilter({ status: key || undefined });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <PageTransition stagger>
      <div className="max-w-5xl">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--color-text)" }}>错题本</h2>

        <div className="flex gap-6">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: "var(--color-border)" }}>
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => handleTabChange(t.key)}
                  className={`flex-1 text-sm py-1.5 rounded-md transition-all ${activeTab === t.key ? "font-medium shadow-sm" : ""}`}
                  style={{
                    background: activeTab === t.key ? "var(--color-surface)" : "transparent",
                    color: activeTab === t.key ? "var(--color-primary)" : "var(--color-text-secondary)",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <select
                className="text-xs border rounded-lg px-2 py-1.5"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)" }}
                value={filter.difficulty || ""}
                onChange={(e) => setFilter({ difficulty: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">全部难度</option>
                {[1, 2, 3, 4, 5].map((d) => (
                  <option key={d} value={d}>{"★".repeat(d)}</option>
                ))}
              </select>
            </div>

            {/* Error list */}
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-16 rounded-xl border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                <div className="text-3xl mb-2">🎉</div>
                <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {activeTab === "unmastered" ? "没有未掌握的错题，继续保持！" : "暂无错题记录"}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => (
                  <ErrorCard
                    key={entry.id}
                    entry={entry}
                    onRetry={retryError}
                    onMaster={markMastered}
                    onDelete={deleteError}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="text-xs px-3 py-1.5 rounded-lg border disabled:opacity-30"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                >
                  上一页
                </button>
                <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="text-xs px-3 py-1.5 rounded-lg border disabled:opacity-30"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                >
                  下一页
                </button>
              </div>
            )}
          </div>

          {/* Sidebar stats */}
          <div className="w-64 shrink-0 hidden lg:block">
            {stats ? <ErrorStatsPanel stats={stats} /> : <Skeleton className="h-64 w-full" />}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
