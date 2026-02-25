"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useUserStore } from "@/stores/user";

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
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 -ml-56 -mt-14">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600">Smart English</h1>
          <p className="text-sm text-gray-500 mt-1">AI 英语学习平台</p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-800">
            {isRegister ? "注册" : "登录"}
          </h2>
          {error && (
            <div className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              手机号
            </label>
            <input
              type="tel"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              type="password"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {isRegister && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  学段
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  年级
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                >
                  {gradeOptions[gradeLevel].map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? "请稍候..." : isRegister ? "注册" : "登录"}
          </button>
          <div className="text-center text-sm text-gray-500">
            {isRegister ? "已有账号？" : "没有账号？"}
            <button
              type="button"
              className="text-blue-500 ml-1"
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
