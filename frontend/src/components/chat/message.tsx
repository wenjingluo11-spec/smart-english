"use client";

function renderMarkdown(text: string) {
  // Simple markdown: **bold**, `code`, line breaks
  return text.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*.*?\*\*|`[^`]+`)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={j} className="px-1 py-0.5 rounded text-xs" style={{ background: "rgba(0,0,0,0.08)" }}>
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
    return (
      <span key={i}>
        {i > 0 && <br />}
        {parts}
      </span>
    );
  });
}

export default function ChatMessage({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
          isUser ? "rounded-br-md" : "rounded-bl-md"
        }`}
        style={{
          background: isUser ? "var(--color-primary)" : "var(--color-surface-hover, #f3f4f6)",
          color: isUser ? "white" : "var(--color-text)",
        }}
      >
        {isUser ? content : renderMarkdown(content)}
      </div>
    </div>
  );
}
