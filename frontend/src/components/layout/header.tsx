"use client";

import { useUserStore } from "@/stores/user";
import { useRouter } from "next/navigation";

export default function Header() {
  const user = useUserStore((s) => s.user);
  const logout = useUserStore((s) => s.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 fixed top-0 left-56 right-0 z-10">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">
          {user ? `${user.grade_level} · ${user.grade}` : ""}
        </span>
        {user && (
          <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
            {user.cefr_level}
          </span>
        )}
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
          {user?.phone?.slice(-2) || "U"}
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          退出
        </button>
      </div>
    </header>
  );
}
