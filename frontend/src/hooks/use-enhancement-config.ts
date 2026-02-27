"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface EnhancementConfig {
  level: "minimal" | "balanced" | "intensive";
  auto_tts: boolean;
  auto_highlight: boolean;
  show_expert_demo: boolean;
  auto_paragraph_review: boolean;
  show_strategy_panel: boolean;
  hint_delay_ms: number;
  recommendations: { type: string; message: string }[];
}

const DEFAULT_CONFIG: EnhancementConfig = {
  level: "balanced",
  auto_tts: true,
  auto_highlight: true,
  show_expert_demo: true,
  auto_paragraph_review: true,
  show_strategy_panel: true,
  hint_delay_ms: 3000,
  recommendations: [],
};

/**
 * V4.2: 获取个性化认知增强配置的 hook。
 *
 * 根据用户行为画像返回个性化的增强强度和推荐功能。
 * 组件可以用这个 hook 来决定是否自动播放 TTS、是否显示学霸演示等。
 */
export function useEnhancementConfig() {
  const [config, setConfig] = useState<EnhancementConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get<EnhancementConfig>("/behavior/enhancement-config")
      .then((data) => {
        setConfig({ ...DEFAULT_CONFIG, ...data });
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  return { config, loaded };
}
