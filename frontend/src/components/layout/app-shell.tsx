"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import AuthGuard from "@/components/layout/auth-guard";
import { useThemeStore } from "@/stores/theme";
import { themeVariables } from "@/lib/theme-config";
import { startTimeTracker, stopTimeTracker } from "@/lib/time-tracker";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const [collapsed, setCollapsed] = useState(false);
  const theme = useThemeStore((s) => s.theme);

  // Apply theme CSS variables to document
  useEffect(() => {
    const vars = themeVariables[theme] || themeVariables.ocean;
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [theme]);

  // Start time tracker for learning time logging
  useEffect(() => {
    if (!isLogin) {
      startTimeTracker();
      return () => stopTimeTracker();
    }
  }, [isLogin]);

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <Header collapsed={collapsed} />
      <main
        className={`${collapsed ? "ml-16" : "ml-56"} mt-14 p-6 transition-all duration-200`}
      >
        {children}
      </main>
    </AuthGuard>
  );
}
