"use client";

import { useEffect, useState } from "react";

export default function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      if (scrollHeight > 0) {
        setProgress(Math.min((scrollTop / scrollHeight) * 100, 100));
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-14 left-0 right-0 h-1 z-20" style={{ background: "var(--color-border)" }}>
      <div
        className="h-full transition-all duration-150"
        style={{ width: `${progress}%`, background: "var(--color-primary)" }}
      />
    </div>
  );
}
