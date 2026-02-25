"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import AuthGuard from "@/components/layout/auth-guard";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <Sidebar />
      <Header />
      <main className="ml-56 mt-14 p-6">{children}</main>
    </AuthGuard>
  );
}
