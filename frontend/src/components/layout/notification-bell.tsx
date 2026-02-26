"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";

interface NotificationItem {
  id: number;
  title: string;
  content: string;
  category: string;
  is_read: boolean;
  link: string;
  created_at: string;
}

const CATEGORY_ICON: Record<string, string> = {
  system: "📢",
  review: "🔄",
  achievement: "🏆",
  streak: "🔥",
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchUnread = () => {
    api.get<{ count: number }>("/notifications/unread-count")
      .then((d) => setUnread(d.count))
      .catch(() => {});
  };

  const fetchAll = () => {
    api.get<NotificationItem[]>("/notifications/")
      .then(setItems)
      .catch(() => {});
  };

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) fetchAll();
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      await api.post(`/notifications/${item.id}/read`, {}).catch(() => {});
      setUnread((u) => Math.max(0, u - 1));
      setItems((prev) => prev.map((n) => n.id === item.id ? { ...n, is_read: true } : n));
    }
    if (item.link) {
      router.push(item.link);
      setOpen(false);
    }
  };

  const handleReadAll = async () => {
    await api.post("/notifications/read-all", {}).catch(() => {});
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "刚刚";
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    return `${Math.floor(hours / 24)}天前`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5"
        style={{ color: "var(--color-text-secondary)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-medium">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 w-80 max-h-96 overflow-y-auto rounded-xl border shadow-lg z-50"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "var(--color-border)" }}>
            <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>通知</span>
            {unread > 0 && (
              <button onClick={handleReadAll} className="text-xs" style={{ color: "var(--color-primary)" }}>
                全部已读
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <div className="py-8 text-center text-xs" style={{ color: "var(--color-text-secondary)" }}>暂无通知</div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleClick(item)}
                className={`px-3 py-2.5 cursor-pointer transition-colors hover:bg-black/5 border-b ${!item.is_read ? "bg-blue-50/50" : ""}`}
                style={{ borderColor: "var(--color-border)" }}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm mt-0.5">{CATEGORY_ICON[item.category] || "📢"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium" style={{ color: "var(--color-text)" }}>{item.title}</div>
                    {item.content && <div className="text-[11px] mt-0.5 truncate" style={{ color: "var(--color-text-secondary)" }}>{item.content}</div>}
                    <div className="text-[10px] mt-1" style={{ color: "var(--color-text-secondary)" }}>{timeAgo(item.created_at)}</div>
                  </div>
                  {!item.is_read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
