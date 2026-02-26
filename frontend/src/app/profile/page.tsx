"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/stores/user";
import { api } from "@/lib/api";
import AccuracyChart from "@/components/profile/accuracy-chart";
import Heatmap from "@/components/profile/heatmap";
import AchievementWall from "@/components/profile/achievement-wall";
import TimeChart from "@/components/profile/time-chart";
import ScoreTrends from "@/components/profile/score-trends";
import MasteryHeatmap from "@/components/profile/mastery-heatmap";
import PeerRank from "@/components/profile/peer-rank";
import LevelBadge from "@/components/ui/level-badge";
import CountUp from "@/components/ui/count-up";
import PageTransition from "@/components/ui/page-transition";
import Skeleton from "@/components/ui/skeleton";

interface LearningReport {
  daily_accuracy: { date: string; total: number; correct: number; rate: number }[];
  heatmap: { date: string; count: number }[];
  total_practice: number;
  total_correct: number;
  vocab_count: number;
  writing_count: number;
  level: number;
  total_xp: number;
  xp_for_next: number;
  streak_days: number;
  cefr: string;
}

interface AchievementItem {
  key: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at: string;
}

export default function ProfilePage() {
  const user = useUserStore((s) => s.user);
  const setAuth = useUserStore((s) => s.setAuth);
  const [report, setReport] = useState<LearningReport | null>(null);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      api.get<{ id: number; phone: string; grade_level: string; grade: string; cefr_level: string }>("/auth/me")
        .then((me) => { setAuth(me, localStorage.getItem("token") || ""); })
        .catch(() => {});
    }
    Promise.all([
      api.get<LearningReport>("/stats/learning-report").catch(() => null),
      api.get<AchievementItem[]>("/stats/achievements").catch(() => []),
    ]).then(([r, a]) => {
      if (r) setReport(r);
      setAchievements(a || []);
    }).finally(() => setLoading(false));
  }, [user, setAuth]);

  const accuracy = report ? (report.total_practice > 0 ? Math.round((report.total_correct / report.total_practice) * 100) : 0) : 0;

  return (
    <PageTransition stagger>
      <div className="max-w-3xl">
        <h2 className="text-hero text-gradient mb-4">个人中心</h2>

        {/* User info card — gradient background */}
        <div className="rounded-2xl p-6 mb-4 shadow-theme-md" style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-gradient-animated"
              style={{ background: "rgba(255,255,255,0.2)", color: "white", borderRadius: "9999px" }}
            >
              {user?.phone?.slice(-2) || "U"}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-lg" style={{ color: "white" }}>{user?.phone || "未登录"}</div>
              <div className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
                {user ? `${user.grade_level} · ${user.grade} · CEFR ${user.cefr_level}` : ""}
              </div>
            </div>
            {report && <LevelBadge level={report.level} xp={report.total_xp} xpForNext={report.xp_for_next} />}
          </div>

          {/* XP progress */}
          {report && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>
                <span>Lv.{report.level} · {report.cefr}</span>
                <span>{report.total_xp} / {report.xp_for_next} XP</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((report.total_xp / report.xp_for_next) * 100, 100)}%`, background: "rgba(255,255,255,0.9)" }} />
              </div>
              {report.streak_days > 0 && (
                <div className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.8)" }}>
                  🔥 连续学习 {report.streak_days} 天
                </div>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "总练习", value: report?.total_practice ?? 0, icon: "📝", gradient: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(6,182,212,0.08))", border: "rgba(59,130,246,0.15)", numColor: "#3b82f6" },
                { label: "正确率", value: accuracy, suffix: "%", icon: "🎯", gradient: "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(132,204,22,0.08))", border: "rgba(34,197,94,0.15)", numColor: "#22c55e" },
                { label: "生词本", value: report?.vocab_count ?? 0, icon: "📚", gradient: "linear-gradient(135deg, rgba(249,115,22,0.1), rgba(234,179,8,0.08))", border: "rgba(249,115,22,0.15)", numColor: "#f97316" },
                { label: "写作", value: report?.writing_count ?? 0, icon: "✍️", gradient: "linear-gradient(135deg, rgba(167,139,250,0.1), rgba(192,132,252,0.08))", border: "rgba(167,139,250,0.15)", numColor: "#a78bfa" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl p-3 text-center transition-all duration-200 hover:-translate-y-0.5 shadow-theme-sm" style={{ background: s.gradient, border: `1px solid ${s.border}` }}>
                  <div className="text-xl mb-1">{s.icon}</div>
                  <div className="text-title font-bold" style={{ color: s.numColor }}>
                    <CountUp end={s.value} />{s.suffix || ""}
                  </div>
                  <div className="text-caption">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Learning time */}
            <TimeChart />

            {/* Score trends */}
            <ScoreTrends />

            {/* Mastery heatmap */}
            <MasteryHeatmap />

            {/* Peer rank */}
            <PeerRank />

            {/* 7-day accuracy chart */}
            {report && report.daily_accuracy.length > 0 && (
              <div className="card-gradient-practice p-4 mb-4 shadow-theme-sm">
                <h3 className="text-sm font-medium mb-2" style={{ color: "var(--color-text)" }}>7 天正确率趋势</h3>
                <AccuracyChart data={report.daily_accuracy} />
              </div>
            )}

            {/* Heatmap */}
            {report && report.heatmap.length > 0 && (
              <div className="card-gradient-grammar p-4 mb-4 shadow-theme-sm">
                <h3 className="text-sm font-medium mb-2" style={{ color: "var(--color-text)" }}>学习热力图（12 周）</h3>
                <Heatmap data={report.heatmap} />
              </div>
            )}

            {/* Achievements */}
            <div className="card-gradient-exam p-4 shadow-theme-sm">
              <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>成就墙</h3>
              <AchievementWall achievements={achievements} />
            </div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
