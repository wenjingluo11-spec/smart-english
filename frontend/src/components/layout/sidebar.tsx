"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "学习主页", icon: "📊" },
  { href: "/tutor", label: "AI 导师", icon: "🤖" },
  { href: "/practice", label: "智能题库", icon: "📝" },
  { href: "/writing", label: "写作批改", icon: "✍️" },
  { href: "/reading", label: "阅读训练", icon: "📖" },
  { href: "/vocabulary", label: "词汇系统", icon: "📚" },
  { href: "/profile", label: "个人中心", icon: "👤" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-blue-600">Smart English</h1>
        <p className="text-xs text-gray-400">AI 英语学习平台</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
