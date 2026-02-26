"use client";

import { useRef, useEffect } from "react";

interface RadarDataPoint {
  label: string;
  value: number; // 0-1
}

export default function RadarChart({ data, size = 220 }: { data: RadarDataPoint[]; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2 - 30;
    const n = data.length;
    const angleStep = (2 * Math.PI) / n;
    const startAngle = -Math.PI / 2;

    // Get CSS variable colors
    const style = getComputedStyle(canvas);
    const borderColor = style.getPropertyValue("--color-border").trim() || "#e5e7eb";
    const primaryColor = style.getPropertyValue("--color-primary").trim() || "#3b82f6";
    const textColor = style.getPropertyValue("--color-text-secondary").trim() || "#6b7280";

    // Draw grid rings
    for (let ring = 1; ring <= 4; ring++) {
      const r = (maxR * ring) / 4;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = startAngle + i * angleStep;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Draw axes
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle));
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Draw data polygon
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const angle = startAngle + idx * angleStep;
      const r = maxR * Math.max(0.05, data[idx].value);
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = primaryColor + "33";
    ctx.fill();
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw data points
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      const r = maxR * Math.max(0.05, data[i].value);
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = primaryColor;
      ctx.fill();
    }

    // Draw labels
    ctx.font = "11px sans-serif";
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep;
      const labelR = maxR + 18;
      const x = cx + labelR * Math.cos(angle);
      const y = cy + labelR * Math.sin(angle);
      const pct = Math.round(data[i].value * 100);
      ctx.fillText(`${data[i].label}`, x, y - 6);
      ctx.fillText(`${pct}%`, x, y + 8);
    }
  }, [data, size]);

  if (data.length === 0) {
    return <div className="flex items-center justify-center text-sm" style={{ height: size, color: "var(--color-text-secondary)" }}>暂无数据</div>;
  }

  return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}
