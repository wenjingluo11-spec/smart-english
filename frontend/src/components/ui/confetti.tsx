"use client";

import { useEffect, useState } from "react";

const COLORS = ["#f87171", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6"];

export default function Confetti({ trigger }: { trigger: boolean }) {
  const [pieces, setPieces] = useState<{ id: number; left: number; color: string; delay: number; size: number }[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const newPieces = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.5,
      size: 6 + Math.random() * 6,
    }));
    setPieces(newPieces);
    const timer = setTimeout(() => setPieces([]), 2500);
    return () => clearTimeout(timer);
  }, [trigger]);

  if (pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: -10,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animation: `confetti-fall ${1.5 + Math.random()}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}
