"use client";

import { useCallback, useRef, useState } from "react";

const SOURCE_TYPES = [
  { value: "game", label: "🎮 游戏" },
  { value: "social", label: "💬 社交媒体" },
  { value: "web", label: "🌐 网页" },
  { value: "other", label: "📄 其他" },
];

interface Props {
  onUpload: (file: File, sourceType: string) => void;
  loading: boolean;
}

export default function UploadZone({ onUpload, loading }: Props) {
  const [sourceType, setSourceType] = useState("other");
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    fileRef.current = file;
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  }, [handleFile]);

  const handleSubmit = useCallback(() => {
    if (fileRef.current) onUpload(fileRef.current, sourceType);
  }, [onUpload, sourceType]);

  return (
    <div className="rounded-xl p-6 space-y-4" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
      {/* Source type selector */}
      <div className="flex gap-2 flex-wrap">
        {SOURCE_TYPES.map((s) => (
          <button
            key={s.value}
            onClick={() => setSourceType(s.value)}
            className="px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              background: sourceType === s.value ? "var(--color-primary)" : "var(--color-bg)",
              color: sourceType === s.value ? "white" : "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
        style={{
          borderColor: dragOver ? "var(--color-primary)" : "var(--color-border)",
          background: dragOver ? "var(--color-primary-light)" : "transparent",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        {preview ? (
          <img src={preview} alt="预览" className="max-h-64 mx-auto rounded-lg" />
        ) : (
          <div className="space-y-2">
            <div className="text-4xl">📸</div>
            <p style={{ color: "var(--color-text-secondary)" }}>拖拽截图到这里，或点击选择文件</p>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>支持 PNG、JPEG、WebP，最大 10MB</p>
          </div>
        )}
      </div>

      {preview && (
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-white font-medium transition-opacity"
            style={{ background: "var(--color-primary)", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "AI 分析中..." : "开始分析"}
          </button>
          <button
            onClick={() => { setPreview(null); fileRef.current = null; }}
            className="px-4 py-2.5 rounded-lg"
            style={{ background: "var(--color-bg)", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
          >
            重选
          </button>
        </div>
      )}
    </div>
  );
}
