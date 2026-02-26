"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import StatOrbit from "@/components/dashboard/stat-orbit";
import MissionBoard from "@/components/dashboard/mission-board";
import ConstellationMap from "@/components/dashboard/constellation-map";
import PageTransition from "@/components/ui/page-transition";

interface DashboardData {
  today_practice: number;
  streak_days: number;
  vocab_mastery_rate: number;
  level: number;
  total_xp: number;
  xp_for_next: number;
  cefr: string;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return "夜深了，注意休息";
  if (h < 12) return "早上好，开始新的一天";
  if (h < 18) return "下午好，继续加油";
  return "晚上好，坚持学习";
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    api.get<DashboardData>("/stats/dashboard").then(setData).catch(() => {});
  }, []);

  return (
    <PageTransition stagger>
      <div className="max-w-4xl mx-auto">
        {/* Hero greeting */}
        <div className="relative mb-8 overflow-hidden">
          <div className="decorative-blob" style={{ top: -80, right: -60 }} />
          <h2 className="text-hero text-gradient" style={{ position: "relative", zIndex: 1 }}>
            {getGreeting()}
          </h2>
          <p className="text-body mt-2" style={{ color: "var(--color-text-secondary)", position: "relative", zIndex: 1 }}>
            继续你的英语之旅
          </p>
          <div className="flex items-center gap-3 mt-3" style={{ position: "relative", zIndex: 1 }}>
            {(data?.streak_days ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.1), rgba(234,179,8,0.1))", color: "#f97316" }}>
                🔥 连续 {data?.streak_days} 天
              </span>
            )}
            {data?.cefr && (
              <span className="pill-gradient text-xs">{data.cefr}</span>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <StatOrbit
          todayPractice={data?.today_practice ?? 0}
          streakDays={data?.streak_days ?? 0}
          vocabRate={data?.vocab_mastery_rate ?? 0}
        />

        {/* Module quick entry grid */}
        <div className="mb-6">
          <ConstellationMap />
        </div>

        {/* Mission board */}
        <MissionBoard />
      </div>
    </PageTransition>
  );
}
