"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface PeerData {
  percentile: number;
  total_peers: number;
  your_xp: number;
  your_level: number;
}

export default function PeerRank() {
  const [data, setData] = useState<PeerData | null>(null);

  useEffect(() => {
    api.get<PeerData>("/stats/report/peer-rank").then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (data.percentile / 100) * circumference;

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
      <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>同年级排名</h3>

      <div className="flex items-center gap-6">
        {/* Circular progress */}
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-border)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke="var(--color-primary)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>
              {data.percentile}%
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-sm" style={{ color: "var(--color-text)" }}>
            超过了 <span className="font-bold" style={{ color: "var(--color-primary)" }}>{data.percentile}%</span> 的同年级同学
          </div>
          <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            同年级共 {data.total_peers} 人
          </div>
          <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            Lv.{data.your_level} · {data.your_xp} XP
          </div>
        </div>
      </div>
    </div>
  );
}
