"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useUserStore } from "@/stores/user";
import Button from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useUserStore((s) => s.setAuth);
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [gradeLevel, setGradeLevel] = useState("初中");
  const [grade, setGrade] = useState("七年级");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const gradeOptions: Record<string, string[]> = {
    小学: ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级"],
    初中: ["七年级", "八年级", "九年级"],
    高中: ["高一", "高二", "高三"],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const body = isRegister
        ? { phone, password, grade_level: gradeLevel, grade }
        : { phone, password };
      const { access_token } = await api.post<{ access_token: string }>(
        endpoint,
        body
      );
      localStorage.setItem("token", access_token);
      const me = await api.get<{
        id: number;
        phone: string;
        grade_level: string;
        grade: string;
        cefr_level: string;
      }>("/auth/me");
      setAuth(me, access_token);

      if (isRegister) {
        router.push("/onboarding");
      } else {
        try {
          const onboarding = await api.get<{ completed: boolean }>("/onboarding/status");
          router.push(onboarding.completed ? "/" : "/onboarding");
        } catch {
          router.push("/");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: "linear-gradient(135deg, var(--color-bg) 0%, color-mix(in srgb, var(--color-primary-light) 30%, var(--color-bg)) 50%, var(--color-bg) 100%)",
      }}
    >
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3"
            style={{
              background: "var(--color-primary)",
              boxShadow: "0 8px 24px color-mix(in srgb, var(--color-primary) 35%, transparent)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
            Smart English
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            AI 英语学习平台
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
            {isRegister ? "注册" : "登录"}
          </h2>

          {error && (
            <div
              className="text-sm px-3 py-2 rounded-lg animate-shake"
              style={{ color: "#ef4444", background: "color-mix(in srgb, #ef4444 8%, var(--color-surface))" }}
            >
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
              手机号
            </label>
            <input
              type="tel"
              required
              className="input-field"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
              密码
            </label>
            <input
              type="password"
              required
              className="input-field"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {isRegister && (
            <div className="stagger-in">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
                  学段
                </label>
                <select
                  className="select-field"
                  value={gradeLevel}
                  onChange={(e) => {
                    setGradeLevel(e.target.value);
                    setGrade(gradeOptions[e.target.value][0]);
                  }}
                >
                  {Object.keys(gradeOptions).map((l) => (
                    <option key={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
                  年级
                </label>
                <select
                  className="select-field"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                >
                  {gradeOptions[gradeLevel].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? "请稍候..." : isRegister ? "注册" : "登录"}
          </Button>

          <div className="text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {isRegister ? "已有账号？" : "没有账号？"}
            <button
              type="button"
              className="ml-1 font-medium transition-colors hover:opacity-80"
              style={{ color: "var(--color-primary)" }}
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
            >
              {isRegister ? "去登录" : "去注册"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
