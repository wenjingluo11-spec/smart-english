"use client";

import { useEffect, useRef, useCallback } from "react";
import { useGalaxyStore } from "@/stores/galaxy";

interface Node {
  id: number; word: string; pos: string; cefr_level: string; status: string;
  x?: number; y?: number; vx?: number; vy?: number;
}

interface Edge {
  source_id: number; target_id: number; relation_type: string;
}

interface Props {
  nodes: Node[];
  edges: Edge[];
}

const STATUS_COLORS: Record<string, string> = {
  undiscovered: "#6b7280", seen: "#60a5fa", familiar: "#fbbf24", mastered: "#34d399",
};

const CEFR_SIZES: Record<string, number> = {
  A1: 8, A2: 10, B1: 12, B2: 14, C1: 16, C2: 18,
};

export default function GalaxyCanvas({ nodes: rawNodes, edges }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animRef = useRef<number>(0);
  const dragRef = useRef<{ node: Node | null; offsetX: number; offsetY: number }>({ node: null, offsetX: 0, offsetY: 0 });
  const selectNode = useGalaxyStore((s) => s.selectNode);

  // Initialize node positions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    nodesRef.current = rawNodes.map((n, i) => ({
      ...n,
      x: n.x ?? w / 2 + (Math.cos(i * 0.618 * Math.PI * 2) * (100 + Math.random() * 200)),
      y: n.y ?? h / 2 + (Math.sin(i * 0.618 * Math.PI * 2) * (100 + Math.random() * 200)),
      vx: 0, vy: 0,
    }));
  }, [rawNodes]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const nodes = nodesRef.current;
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Simple force simulation step
    for (let iter = 0; iter < 3; iter++) {
      // Repulsion between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = (b.x ?? 0) - (a.x ?? 0);
          const dy = (b.y ?? 0) - (a.y ?? 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 800 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx = (a.vx ?? 0) - fx;
          a.vy = (a.vy ?? 0) - fy;
          b.vx = (b.vx ?? 0) + fx;
          b.vy = (b.vy ?? 0) + fy;
        }
      }

      // Attraction along edges
      for (const e of edges) {
        const a = nodeMap.get(e.source_id);
        const b = nodeMap.get(e.target_id);
        if (!a || !b) continue;
        const dx = (b.x ?? 0) - (a.x ?? 0);
        const dy = (b.y ?? 0) - (a.y ?? 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 80) * 0.01;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx = (a.vx ?? 0) + fx;
        a.vy = (a.vy ?? 0) + fy;
        b.vx = (b.vx ?? 0) - fx;
        b.vy = (b.vy ?? 0) - fy;
      }

      // Center gravity
      for (const n of nodes) {
        n.vx = (n.vx ?? 0) + (w / 2 - (n.x ?? 0)) * 0.001;
        n.vy = (n.vy ?? 0) + (h / 2 - (n.y ?? 0)) * 0.001;
      }

      // Apply velocity with damping
      for (const n of nodes) {
        if (dragRef.current.node?.id === n.id) continue;
        n.vx = (n.vx ?? 0) * 0.85;
        n.vy = (n.vy ?? 0) * 0.85;
        n.x = (n.x ?? 0) + (n.vx ?? 0);
        n.y = (n.y ?? 0) + (n.vy ?? 0);
        // Bounds
        n.x = Math.max(20, Math.min(w - 20, n.x));
        n.y = Math.max(20, Math.min(h - 20, n.y));
      }
    }

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Draw edges
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "rgba(150,150,150,0.3)";
    for (const e of edges) {
      const a = nodeMap.get(e.source_id);
      const b = nodeMap.get(e.target_id);
      if (!a || !b) continue;
      ctx.beginPath();
      ctx.moveTo(a.x ?? 0, a.y ?? 0);
      ctx.lineTo(b.x ?? 0, b.y ?? 0);
      ctx.stroke();
    }

    // Draw nodes
    for (const n of nodes) {
      const r = CEFR_SIZES[n.cefr_level] || 10;
      const color = STATUS_COLORS[n.status] || STATUS_COLORS.undiscovered;

      ctx.beginPath();
      ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = n.status === "undiscovered" ? 0.4 : 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Label
      ctx.fillStyle = color;
      ctx.font = `${Math.max(9, r - 2)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(n.word, n.x ?? 0, (n.y ?? 0) + r + 12);
    }

    animRef.current = requestAnimationFrame(draw);
  }, [edges]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // Mouse interaction
  const findNode = useCallback((mx: number, my: number): Node | null => {
    for (const n of nodesRef.current) {
      const r = CEFR_SIZES[n.cefr_level] || 10;
      const dx = (n.x ?? 0) - mx;
      const dy = (n.y ?? 0) - my;
      if (dx * dx + dy * dy < (r + 4) * (r + 4)) return n;
    }
    return null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const node = findNode(mx, my);
    if (node) {
      dragRef.current = { node, offsetX: mx - (node.x ?? 0), offsetY: my - (node.y ?? 0) };
    }
  }, [findNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { node, offsetX, offsetY } = dragRef.current;
    if (!node) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    node.x = e.clientX - rect.left - offsetX;
    node.y = e.clientY - rect.top - offsetY;
    node.vx = 0;
    node.vy = 0;
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = { node: null, offsetX: 0, offsetY: 0 };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const node = findNode(e.clientX - rect.left, e.clientY - rect.top);
    if (node) selectNode(node.id);
  }, [findNode, selectNode]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      style={{ background: "var(--color-bg)" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
    />
  );
}
