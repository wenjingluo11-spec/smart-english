"use client";

import { useState } from "react";
import { useClinicStore } from "@/stores/clinic";

const SEVERITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  mild: { bg: "#dcfce7", text: "#166534", label: "轻微" },
  moderate: { bg: "#fef9c3", text: "#854d0e", label: "中等" },
  severe: { bg: "#fef2f2", text: "#991b1b", label: "严重" },
};

const TYPE_LABELS: Record<string, string> = {
  grammar: "语法", vocabulary: "词汇", l1_transfer: "母语迁移", spelling: "拼写",
};

interface Props {
  pattern: {
    id: number;
    pattern_type: string;
    title: string;
    description: string;
    severity: string;
    evidence_json: Record<string, unknown> | null;
    diagnosis_json: Record<string, unknown> | null;
    status: string;
    created_at: string;
  };
}

export default function PatternCard({ pattern }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { startTreatment } = useClinicStore();
  const sev = SEVERITY_COLORS[pattern.severity] || SEVERITY_COLORS.moderate;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
    >
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ background: sev.bg, color: sev.text }}>
            {sev.label}
          </span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--color-bg)", color: "var(--color-text-secondary)" }}>
            {TYPE_LABELS[pattern.pattern_type] || pattern.pattern_type}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              background: pattern.status === "resolved" ? "#dcfce7" : pattern.status === "treating" ? "#dbeafe" : "var(--color-bg)",
              color: pattern.status === "resolved" ? "#166534" : pattern.status === "treating" ? "#1e40af" : "var(--color-text-secondary)",
            }}
          >
            {pattern.status === "active" ? "待治疗" : pattern.status === "treating" ? "治疗中" : "已解决"}
          </span>
          <span className="ml-auto text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
        <h3 className="font-medium mt-2" style={{ color: "var(--color-text)" }}>{pattern.title}</h3>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>{pattern.description}</p>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid var(--color-border)" }}>
          {pattern.diagnosis_json && (
            <div className="pt-3 space-y-2">
              {(pattern.diagnosis_json as { root_cause?: string }).root_cause && (
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>根本原因</p>
                  <p className="text-sm" style={{ color: "var(--color-text)" }}>{(pattern.diagnosis_json as { root_cause: string }).root_cause}</p>
                </div>
              )}
              {(pattern.diagnosis_json as { l1_interference?: string }).l1_interference && (
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>母语干扰</p>
                  <p className="text-sm" style={{ color: "var(--color-text)" }}>{(pattern.diagnosis_json as { l1_interference: string }).l1_interference}</p>
                </div>
              )}
            </div>
          )}

          {pattern.status === "active" && (
            <button
              onClick={(e) => { e.stopPropagation(); startTreatment(pattern.id); }}
              className="w-full py-2 rounded-lg text-white text-sm font-medium"
              style={{ background: "var(--color-primary)" }}
            >
              开始治疗
            </button>
          )}
        </div>
      )}
    </div>
  );
}
