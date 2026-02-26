"use client";

import { useGalaxyStore } from "@/stores/galaxy";

export default function NodeDetailPanel() {
  const { selectedNode, relatedNodes, relatedEdges, exploreNode, learnNode, loading } = useGalaxyStore();

  if (!selectedNode) return null;

  const STATUS_COLORS: Record<string, string> = {
    undiscovered: "#6b7280", seen: "#60a5fa", familiar: "#fbbf24", mastered: "#34d399",
  };
  const STATUS_LABELS: Record<string, string> = {
    undiscovered: "未发现", seen: "已见", familiar: "熟悉", mastered: "已掌握",
  };
  const RELATION_LABELS: Record<string, string> = {
    synonym: "同义词", antonym: "反义词", family: "词族", collocation: "搭配", derived: "派生",
  };

  return (
    <div className="p-4 space-y-4">
      {/* Word header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>{selectedNode.word}</h2>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--color-bg)", color: "var(--color-text-secondary)" }}>
            {selectedNode.pos}
          </span>
          <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--color-primary-light)", color: "var(--color-primary)" }}>
            {selectedNode.cefr_level}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[selectedNode.status] }} />
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{STATUS_LABELS[selectedNode.status]}</span>
        </div>
      </div>

      {/* Definition */}
      <div>
        <p className="text-sm" style={{ color: "var(--color-text)" }}>{selectedNode.definition}</p>
        {selectedNode.definition_en && (
          <p className="text-xs mt-1 italic" style={{ color: "var(--color-text-secondary)" }}>{selectedNode.definition_en}</p>
        )}
      </div>

      {/* Example */}
      {selectedNode.example_sentence && (
        <div className="p-3 rounded-lg" style={{ background: "var(--color-bg)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>例句</p>
          <p className="text-sm italic" style={{ color: "var(--color-text)" }}>{selectedNode.example_sentence}</p>
        </div>
      )}

      {/* Status buttons */}
      <div className="flex gap-2">
        {(["seen", "familiar", "mastered"] as const).map((s) => (
          <button
            key={s}
            onClick={() => learnNode(selectedNode.id, s)}
            className="flex-1 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: selectedNode.status === s ? STATUS_COLORS[s] : "var(--color-bg)",
              color: selectedNode.status === s ? "white" : "var(--color-text-secondary)",
              border: `1px solid ${STATUS_COLORS[s]}`,
            }}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Related words */}
      {relatedNodes.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: "var(--color-text-secondary)" }}>关联词</p>
          <div className="space-y-2">
            {relatedNodes.map((n) => {
              const edge = relatedEdges.find(
                (e) => (e.source_id === selectedNode.id && e.target_id === n.id) || (e.target_id === selectedNode.id && e.source_id === n.id)
              );
              return (
                <div
                  key={n.id}
                  onClick={() => useGalaxyStore.getState().selectNode(n.id)}
                  className="p-2 rounded-lg cursor-pointer flex items-center gap-2 hover:opacity-80"
                  style={{ background: "var(--color-bg)" }}
                >
                  <span className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>{n.word}</span>
                  {edge && (
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--color-card)", color: "var(--color-text-secondary)" }}>
                      {RELATION_LABELS[edge.relation_type] || edge.relation_type}
                    </span>
                  )}
                  <span className="text-xs ml-auto" style={{ color: "var(--color-text-secondary)" }}>{n.definition}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Explore button */}
      <button
        onClick={() => exploreNode(selectedNode.id)}
        disabled={loading}
        className="w-full py-2.5 rounded-lg text-white text-sm font-medium"
        style={{ background: "var(--color-primary)", opacity: loading ? 0.6 : 1 }}
      >
        {loading ? "探索中..." : "🔭 AI 探索更多关联词"}
      </button>

      <button
        onClick={() => useGalaxyStore.setState({ selectedNode: null, relatedNodes: [], relatedEdges: [] })}
        className="w-full py-2 rounded-lg text-sm"
        style={{ background: "var(--color-bg)", color: "var(--color-text-secondary)" }}
      >
        关闭
      </button>
    </div>
  );
}
