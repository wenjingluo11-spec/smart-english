"use client";

import { useEffect } from "react";
import { useGalaxyStore } from "@/stores/galaxy";
import GalaxyCanvas from "@/components/galaxy/galaxy-canvas";
import NodeDetailPanel from "@/components/galaxy/node-detail-panel";
import GalaxyStats from "@/components/galaxy/galaxy-stats";

export default function GalaxyPage() {
  const { nodes, edges, selectedNode, stats, loading, fetchView, fetchStats } = useGalaxyStore();

  useEffect(() => {
    fetchView();
    fetchStats();
  }, [fetchView, fetchStats]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>🌌 知识星系</h1>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            探索词汇宇宙，点亮你的知识星图
          </p>
        </div>
        {stats && <GalaxyStats stats={stats} />}
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          {loading && nodes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center" style={{ color: "var(--color-text-secondary)" }}>
              加载中...
            </div>
          ) : (
            <GalaxyCanvas nodes={nodes} edges={edges} />
          )}
        </div>

        {selectedNode && (
          <div className="w-80 border-l overflow-y-auto" style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}>
            <NodeDetailPanel />
          </div>
        )}
      </div>
    </div>
  );
}
