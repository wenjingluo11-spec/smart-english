"use client";

import { ROLE_COLORS } from "@/lib/cognitive-styles";

interface SentenceComponent {
  text: string;
  role: string;
  is_core: boolean;
}

interface SentenceBreakerProps {
  sentence: string;
  components: SentenceComponent[];
  simplifiedZh?: string;
  structureHint?: string;
  className?: string;
}



export default function SentenceBreaker({
  sentence,
  components,
  simplifiedZh,
  structureHint,
  className = "",
}: SentenceBreakerProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {structureHint && (
        <div className="text-xs px-2.5 py-1 rounded-lg inline-block"
          style={{ background: "rgba(8,145,178,0.08)", color: "#0891b2" }}>
          {structureHint}
        </div>
      )}

      <div className="text-base leading-loose whitespace-pre-wrap">
        {components.map((comp, i) => {
          const color = ROLE_COLORS[comp.role] || "#6b7280";
          return (
            <span key={i} className="relative inline group">
              <span
                className="px-0.5 rounded-sm transition-colors"
                style={{
                  background: `${color}${comp.is_core ? "20" : "10"}`,
                  color: comp.is_core ? color : `${color}cc`,
                  fontWeight: comp.is_core ? 700 : 400,
                  borderBottom: `2px solid ${color}${comp.is_core ? "80" : "40"}`,
                }}
              >
                {comp.text}
              </span>
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                style={{ background: color }}>
                {comp.role}{comp.is_core ? " (核心)" : ""}
              </span>
            </span>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {[...new Set(components.map((c) => c.role))].map((role) => {
          const color = ROLE_COLORS[role] || "#6b7280";
          return (
            <span key={role} className="flex items-center gap-1 text-xs" style={{ color }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: `${color}30`, borderBottom: `2px solid ${color}` }} />
              {role}
            </span>
          );
        })}
      </div>

      {simplifiedZh && (
        <p className="text-sm italic" style={{ color: "#6b7280" }}>
          {simplifiedZh}
        </p>
      )}
    </div>
  );
}
