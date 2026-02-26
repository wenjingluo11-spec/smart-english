"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useProgressStore } from "@/stores/progress";
import { useXpStore } from "@/stores/xp";

/* ── icon helpers (inline SVGs) ── */
const icons = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  practice: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>,
  reading: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
  writing: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>,
  vocabulary: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>,
  exam: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
  tutor: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  screenshot: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>,
  story: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /><path d="M8 7h6" /><path d="M8 11h8" /></svg>,
  arena: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><path d="m10 12 2 2 4-4" /></svg>,
  quests: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>,
  galaxy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" opacity="0.3" /><circle cx="19" cy="5" r="2" /><circle cx="5" cy="19" r="2" /></svg>,
  clinic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M9 2h6v6h6v6h-6v6H9v-6H3V8h6z" /></svg>,
  profile: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
  chevron: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="6 9 12 15 18 9" /></svg>,
  book: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
  robot: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M12 2v6" /><circle cx="9" cy="14" r="1.5" /><circle cx="15" cy="14" r="1.5" /></svg>,
  sword: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M14.5 2l6 6-9 9-6-6 9-9z" /><path d="M3 21l3.5-3.5" /><path d="M6.5 17.5l-3 3" /></svg>,
  errorBook: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /><line x1="9" y1="8" x2="15" y2="14" /><line x1="15" y1="8" x2="9" y2="14" /></svg>,
};

/* ── nav structure ── */
type NavItem = { href: string; label: string; badge: string | null; icon: React.ReactNode };
type NavGroup =
  | { kind: "link"; href: string; label: string; icon: React.ReactNode; badge: string | null }
  | { kind: "group"; key: string; label: string; icon: React.ReactNode; items: NavItem[] };

const navGroups: NavGroup[] = [
  { kind: "link", href: "/", label: "学习主页", icon: icons.home, badge: null },
  {
    kind: "group", key: "core", label: "核心学习", icon: icons.book,
    items: [
      { href: "/practice", label: "智能题库", badge: "todayPractice", icon: icons.practice },
      { href: "/reading", label: "阅读训练", badge: null, icon: icons.reading },
      { href: "/writing", label: "写作批改", badge: "writingCount", icon: icons.writing },
      { href: "/vocabulary", label: "词汇系统", badge: "dueVocab", icon: icons.vocabulary },
      { href: "/grammar", label: "语法专项", badge: null, icon: icons.writing },
      { href: "/textbook", label: "教材同步", badge: null, icon: icons.book },
    ],
  },
  {
    kind: "group", key: "exam", label: "考试备战", icon: icons.exam,
    items: [
      { href: "/exam", label: "考试冲刺", badge: null, icon: icons.exam },
      { href: "/errors", label: "错题本", badge: "errorCount", icon: icons.errorBook },
      { href: "/clinic", label: "错题诊所", badge: null, icon: icons.clinic },
    ],
  },
  {
    kind: "group", key: "ai", label: "AI 互动", icon: icons.robot,
    items: [
      { href: "/tutor", label: "AI 导师", badge: null, icon: icons.tutor },
      { href: "/screenshot", label: "截图学英语", badge: null, icon: icons.screenshot },
      { href: "/story", label: "互动故事", badge: null, icon: icons.story },
    ],
  },
  {
    kind: "group", key: "challenge", label: "挑战拓展", icon: icons.sword,
    items: [
      { href: "/arena", label: "英语对战", badge: null, icon: icons.arena },
      { href: "/quests", label: "真实任务", badge: null, icon: icons.quests },
      { href: "/galaxy", label: "知识星系", badge: null, icon: icons.galaxy },
    ],
  },
  { kind: "link", href: "/profile", label: "个人中心", icon: icons.profile, badge: null },
];

/* ── component ── */
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { dueVocab, todayPractice, writingCount, errorCount, loaded, fetchProgress } = useProgressStore();
  const streakDays = useXpStore((s) => s.streakDays);

  useEffect(() => {
    if (!loaded) fetchProgress();
  }, [loaded, fetchProgress]);

  const badgeValues: Record<string, number> = { dueVocab, todayPractice, writingCount, errorCount };
  const badgeLabels: Record<string, (v: number) => string> = {
    dueVocab: (v) => `${v} 词待复习`,
    todayPractice: (v) => `今日 ${v} 题`,
    writingCount: (v) => `${v} 篇`,
    errorCount: (v) => `${v} 题`,
  };

  // auto-expand groups that contain the active route
  const activeGroups = useMemo(() => {
    const set = new Set<string>();
    for (const g of navGroups) {
      if (g.kind === "group" && g.items.some((i) => pathname === i.href)) {
        set.add(g.key);
      }
    }
    return set;
  }, [pathname]);

  const [expanded, setExpanded] = useState<Set<string>>(activeGroups);

  // keep active group expanded when route changes
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);
      activeGroups.forEach((k) => next.add(k));
      return next.size !== prev.size ? next : prev;
    });
  }, [activeGroups]);

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  /* shared styles */
  const linkCls = (active: boolean) =>
    `relative flex items-center gap-3 rounded-lg text-sm transition-all duration-200 ${
      collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
    } ${active ? "" : "hover:translate-x-0.5"}`;

  const linkStyle = (active: boolean): React.CSSProperties => ({
    background: active
      ? "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 12%, transparent), color-mix(in srgb, var(--color-accent) 8%, transparent))"
      : "transparent",
    color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
    fontWeight: active ? 500 : 400,
  });

  /* Active indicator bar — gradient from primary → accent */
  const ActiveBar = () => (
    <span
      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-200"
      style={{ height: "60%", background: "linear-gradient(180deg, var(--color-primary), var(--color-accent))" }}
    />
  );

  /* Active icon background */
  const IconWrap = ({ active, children }: { active: boolean; children: React.ReactNode }) => (
    <span
      className="shrink-0 flex items-center justify-center rounded-lg transition-all duration-200"
      style={{
        width: 28, height: 28,
        background: active
          ? "linear-gradient(135deg, var(--color-primary), var(--color-accent))"
          : "transparent",
        color: active ? "white" : "inherit",
      }}
    >
      {children}
    </span>
  );

  const renderBadge = (badgeKey: string | null) => {
    if (!badgeKey) return null;
    const val = badgeValues[badgeKey];
    if (!val || val <= 0) return null;
    return (
      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--color-primary)", color: "white", fontSize: 10 }}>
        {badgeLabels[badgeKey](val)}
      </span>
    );
  };

  const renderNavItem = (item: NavItem, indent = false) => {
    const active = pathname === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={linkCls(active)}
        style={{ ...linkStyle(active), ...(indent && !collapsed ? { paddingLeft: 36 } : {}) }}
      >
        {active && <ActiveBar />}
        <IconWrap active={active}>{item.icon}</IconWrap>
        {!collapsed && (
          <span className="flex-1 flex items-center justify-between">
            <span>{item.label}</span>
            {renderBadge(item.badge)}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={`${collapsed ? "w-16" : "w-56"} h-screen fixed left-0 top-0 flex flex-col transition-all duration-200 border-r`}
      style={{ background: "var(--color-sidebar)", borderColor: "var(--color-border)" }}
    >
      {/* header */}
      <div className={`p-4 border-b ${collapsed ? "px-3" : ""}`} style={{ borderColor: "var(--color-border)" }}>
        {collapsed ? (
          <div className="text-lg font-bold text-center text-gradient">S</div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gradient">Smart English</h1>
              {streakDays > 0 && <span className="text-sm" title={`连续学习 ${streakDays} 天`}>🔥</span>}
            </div>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>AI 英语学习平台</p>
          </>
        )}
      </div>

      {/* nav */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navGroups.map((entry) => {
          if (entry.kind === "link") {
            const active = pathname === entry.href;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                title={collapsed ? entry.label : undefined}
                className={linkCls(active)}
                style={linkStyle(active)}
              >
                {active && <ActiveBar />}
                <IconWrap active={active}>{entry.icon}</IconWrap>
                {!collapsed && (
                  <span className="flex-1 flex items-center justify-between">
                    <span>{entry.label}</span>
                    {renderBadge(entry.badge)}
                  </span>
                )}
              </Link>
            );
          }

          // collapsible group
          const isOpen = expanded.has(entry.key);
          const groupActive = entry.items.some((i) => pathname === i.href);

          return (
            <div key={entry.key}>
              <button
                onClick={() => toggle(entry.key)}
                title={collapsed ? entry.label : undefined}
                className={`w-full flex items-center gap-3 rounded-lg text-sm transition-colors mt-2 ${
                  collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
                }`}
                style={{
                  color: groupActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                  fontWeight: groupActive ? 500 : 400,
                  background: "transparent",
                }}
              >
                <span className="shrink-0">{entry.icon}</span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{entry.label}</span>
                    <span className={`transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}>
                      {icons.chevron}
                    </span>
                  </>
                )}
              </button>
              {!collapsed && isOpen && (
                <div className="space-y-0.5">
                  {entry.items.map((item) => renderNavItem(item, true))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* collapse toggle */}
      <button
        onClick={onToggle}
        className="p-3 border-t flex items-center justify-center transition-colors"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
      >
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`w-5 h-5 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
        >
          <polyline points="11 17 6 12 11 7" />
          <polyline points="18 17 13 12 18 7" />
        </svg>
      </button>
    </aside>
  );
}
