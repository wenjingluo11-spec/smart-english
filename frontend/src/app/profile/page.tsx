"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/stores/user";
import { api } from "@/lib/api";

export default function ProfilePage() {
  const user = useUserStore((s) => s.user);
  const setAuth = useUserStore((s) => s.setAuth);
  const [stats, setStats] = useState({ total: 0, correct: 0, vocab: 0, writing: 0 });

  useEffect(() => {
    // Fetch user info if not loaded
    if (!user) {
      api
        .get<{
          id: number;
          phone: string;
          grade_level: string;
          grade: string;
          cefr_level: string;
        }>("/auth/me")
        .then((me) => {
          const token = localStorage.getItem("token") || "";
          setAuth(me, token);
        })
        .catch(() => {});
    }
  }, [user, setAuth]);

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">个人中心</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold">
            {user?.phone?.slice(-2) || "U"}
          </div>
          <div>
            <div className="font-medium text-gray-800">
              {user?.phone || "未登录"}
            </div>
            <div className="text-sm text-gray-500">
              {user
                ? `${user.grade_level} · ${user.grade} · CEFR ${user.cefr_level}`
                : ""}
            </div>
          </div>
        </div>
        <hr className="border-gray-200" />
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-800">{stats.total}</div>
            <div className="text-xs text-gray-500">总练习题数</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-800">
              {stats.total > 0
                ? Math.round((stats.correct / stats.total) * 100) + "%"
                : "0%"}
            </div>
            <div className="text-xs text-gray-500">正确率</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-800">{stats.vocab}</div>
            <div className="text-xs text-gray-500">生词本</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-800">{stats.writing}</div>
            <div className="text-xs text-gray-500">写作提交</div>
          </div>
        </div>
      </div>
    </div>
  );
}
