"use client";

export function CorrectFeedback() {
  return (
    <div className="inline-flex items-center gap-2 animate-slide-up">
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M5 10l3.5 3.5L15 7"
              stroke="#22c55e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="20"
              strokeDashoffset="20"
              style={{ animation: "draw-check 0.4s 0.2s ease-out forwards" }}
            />
          </svg>
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-pulse-ring" />
      </div>
      <span className="text-green-600 font-medium text-sm">回答正确！</span>
    </div>
  );
}

export function WrongFeedback() {
  return (
    <div className="inline-flex items-center gap-2 animate-shake">
      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 4l8 8M12 4l-8 8" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <span className="text-red-600 font-medium text-sm">回答错误</span>
    </div>
  );
}
