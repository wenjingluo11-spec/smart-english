"use client";

import { useEffect, useState } from "react";

interface XPToastProps {
  xpGained: number;
  trigger: number; // increment to re-trigger
}

export default function XPToast({ xpGained, trigger }: XPToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger === 0 || xpGained === 0) return;
    setShow(true);
    const timer = setTimeout(() => setShow(false), 1200);
    return () => clearTimeout(timer);
  }, [trigger, xpGained]);

  if (!show) return null;

  return (
    <div className="fixed top-20 right-8 z-50 animate-float-up pointer-events-none">
      <div className="bg-yellow-400 text-yellow-900 font-bold px-4 py-2 rounded-full shadow-lg text-sm">
        +{xpGained} XP
      </div>
    </div>
  );
}
