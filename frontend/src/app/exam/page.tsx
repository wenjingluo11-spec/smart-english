"use client";

import { useEffect, useState } from "react";
import { useExamStore } from "@/stores/exam";
import Link from "next/link";
import RadarChart from "@/components/exam/radar-chart";
import ScoreGauge from "@/components/exam/score-gauge";
import ExamCountdown from "@/components/exam/exam-countdown";

export default function ExamPage() {
  const {
    profile, daysRemaining, sectionMasteries, recentMockScores, weakCount,
    loading, fetchDashboard, createProfile,
    sprintPlan, fetchSprintPlan, completeSprintTask,
  } = useExamStore();

  const [showSetup, setShowSetup] = useState(false);
  const [form, setForm] = useState({ exam_type: "zhongkao", province: "通用", target_score: 140, exam_date: "" });

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useEffect(() => {
    if (!loading && !profile) setShowSetup(true);
  }, [loading, profile]);

  useEffect(() => {
    if (profile) fetchSprintPlan();
  }, [profile, fetchSprintPlan]);

  const handleSetup = async () => {
    if (!form.exam_date) return;
    await createProfile(form);
    setShowSetup(false);
    fetchDashboard();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 rounded-full" style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (showSetup || !profile) {
    return (
      <div className="max-w-lg mx-auto mt-12 p-6 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text)" }}>🎯 考试冲刺设置</h1>
        <p className="text-sm mb-6" style={{ color: "var(--color-text-secondary)" }}>设置你的考试信息，开启个性化冲刺之旅</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>考试类型</label>
            <div className="flex gap-3">
              {[{ v: "zhongkao", l: "中考" }, { v: "gaokao", l: "高考" }].map(({ v, l }) => (
                <button key={v} onClick={() => setForm({ ...form, exam_type: v })}
                  className="flex-1 py-3 rounded-xl text-center font-medium transition-all"
                  style={{
                    background: form.exam_type === v ? "var(--color-primary)" : "var(--color-bg)",
                    color: form.exam_type === v ? "white" : "var(--color-text)",
                    border: `2px solid ${form.exam_type === v ? "var(--color-primary)" : "var(--color-border)"}`,
                  }}
                >{l}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>省份</label>
            <select value={form.province} onChange={e => setForm({ ...form, province: e.target.value })}
              className="w-full px-3 py-2 rounded-lg" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}>
              {["通用", "北京", "上海", "天津", "浙江", "江苏", "山东", "广东", "河北", "河南", "湖北", "湖南", "四川", "重庆", "陕西", "福建", "安徽", "江西"].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>目标分数</label>
            <input type="number" value={form.target_score} onChange={e => setForm({ ...form, target_score: +e.target.value })}
              className="w-full px-3 py-2 rounded-lg" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }}
              min={90} max={150} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-text)" }}>考试日期</label>
            <input type="date" value={form.exam_date} onChange={e => setForm({ ...form, exam_date: e.target.value })}
              className="w-full px-3 py-2 rounded-lg" style={{ background: "var(--color-bg)", color: "var(--color-text)", border: "1px solid var(--color-border)" }} />
          </div>

          <button onClick={handleSetup} disabled={!form.exam_date}
            className="w-full py-3 rounded-xl text-white font-medium mt-2 transition-opacity"
            style={{ background: "var(--color-primary)", opacity: form.exam_date ? 1 : 0.5 }}>
            开始冲刺
          </button>
        </div>
      </div>
    );
  }

  const radarData = sectionMasteries.map(s => ({ label: s.label, value: s.mastery }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 顶部：倒计时 + 分数 */}
      <div className="grid grid-cols-3 gap-4">
        <ExamCountdown days={daysRemaining} />
        <ScoreGauge label="目标分数" score={profile.target_score} max={150} color="var(--color-primary)" />
        <ScoreGauge label="预估分数" score={profile.current_estimated_score} max={150} color={profile.current_estimated_score >= profile.target_score ? "#22c55e" : "#f59e0b"} />
      </div>

      {/* 雷达图 + 模考趋势 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>六维掌握度</h3>
          <RadarChart data={radarData} size={220} />
        </div>
        <div className="p-4 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>模考成绩趋势</h3>
          {recentMockScores.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: "var(--color-text-secondary)" }}>暂无模考记录</div>
          ) : (
            <div className="space-y-2 mt-2">
              {recentMockScores.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span style={{ color: "var(--color-text-secondary)" }}>{m.completed_at?.slice(0, 10)}</span>
                  <span className="font-bold" style={{ color: "var(--color-primary)" }}>{m.total}/{m.max}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 今日冲刺计划 */}
      {sprintPlan && (
        <div className="p-4 rounded-2xl" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium" style={{ color: "var(--color-text)" }}>🏃 今日冲刺</h3>
            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {sprintPlan.completed_count}/{sprintPlan.total_count} 已完成
            </span>
          </div>
          {sprintPlan.motivation && (
            <p className="text-xs mb-3 italic" style={{ color: "var(--color-primary)" }}>{sprintPlan.motivation}</p>
          )}
          <div className="space-y-2">
            {sprintPlan.tasks.map((task, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--color-bg)", opacity: task.completed ? 0.5 : 1 }}>
                <button onClick={() => !task.completed && completeSprintTask(i)}
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: task.completed ? "#22c55e" : "var(--color-border)", background: task.completed ? "#22c55e" : "transparent" }}>
                  {task.completed && <span className="text-white text-xs">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: "var(--color-text)", textDecoration: task.completed ? "line-through" : "none" }}>{task.title}</div>
                  <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{task.reason}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{task.estimated_minutes}分钟</span>
                  <span className="text-xs font-medium" style={{ color: "var(--color-primary)" }}>+{task.xp_reward}</span>
                </div>
              </div>
            ))}
          </div>
          {sprintPlan.is_completed && (
            <div className="mt-3 text-center text-sm font-medium" style={{ color: "#22c55e" }}>
              🎉 今日冲刺任务全部完成！
            </div>
          )}
        </div>
      )}

      {/* 快捷入口 */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { href: "/exam/flow", icon: "🎯", label: "心流刷题", desc: "沉浸连击模式" },
          { href: "/exam/training", icon: "📚", label: "专项训练", desc: `${sectionMasteries.length} 大题型` },
          { href: "/exam/mock", icon: "📝", label: "全真模考", desc: "严格模拟考试" },
          { href: "/exam/weakness", icon: "💪", label: "薄弱突破", desc: `${weakCount} 个待突破` },
          { href: "/exam/error-genes", icon: "🧬", label: "错题基因", desc: "AI 错误模式分析" },
          { href: "/exam/custom", icon: "🤖", label: "AI 出题", desc: "自定义出题" },
          { href: "/exam/diagnostic", icon: "🩺", label: "入学诊断", desc: "全维度测评" },
          { href: "/exam/replay", icon: "📊", label: "成长回放", desc: "备考纪录片" },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:scale-[1.02]"
            style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
            <span className="text-3xl">{item.icon}</span>
            <div>
              <div className="font-medium" style={{ color: "var(--color-text)" }}>{item.label}</div>
              <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{item.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
