"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import AssessmentStep from "@/components/onboarding/assessment-step";
import GoalsStep from "@/components/onboarding/goals-step";

type Step = "assessment" | "result" | "goals" | "path" | "done";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("assessment");
  const [assessmentResult, setAssessmentResult] = useState<{
    score: number; correct: number; total: number; cefr_level: string;
  } | null>(null);
  const [recommendedPath, setRecommendedPath] = useState("");

  const handleAssessmentComplete = (result: typeof assessmentResult) => {
    setAssessmentResult(result);
    setStep("result");
  };

  const handleGoalsComplete = (result: { recommended_path: string }) => {
    setRecommendedPath(result.recommended_path);
    setStep("path");
  };

  const handleFinish = async () => {
    await api.post("/onboarding/complete", {}).catch(() => {});
    router.push("/");
  };

  const steps = ["测评", "目标", "路径"];
  const stepIndex = step === "assessment" ? 0 : step === "result" ? 0 : step === "goals" ? 1 : 2;

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg, #f8fafc)" }}>
      <div className="w-full max-w-md">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  i <= stepIndex ? "text-white" : ""
                }`}
                style={{
                  background: i <= stepIndex ? "var(--color-primary)" : "var(--color-border)",
                  color: i <= stepIndex ? "#fff" : "var(--color-text-secondary)",
                }}
              >
                {i + 1}
              </div>
              <span className="text-xs" style={{ color: i <= stepIndex ? "var(--color-primary)" : "var(--color-text-secondary)" }}>
                {s}
              </span>
              {i < steps.length - 1 && (
                <div className="w-8 h-0.5 rounded" style={{ background: i < stepIndex ? "var(--color-primary)" : "var(--color-border)" }} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-xl border p-6" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
          {step === "assessment" && (
            <AssessmentStep onComplete={handleAssessmentComplete} />
          )}

          {step === "result" && assessmentResult && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-text)" }}>测评完成</h3>
              <div className="inline-flex items-center gap-3 px-4 py-3 rounded-xl mb-4" style={{ background: "var(--color-primary-light, #dbeafe)" }}>
                <div>
                  <div className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>{assessmentResult.score}</div>
                  <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>得分</div>
                </div>
                <div className="w-px h-10" style={{ background: "var(--color-border)" }} />
                <div>
                  <div className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>{assessmentResult.cefr_level}</div>
                  <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>CEFR 等级</div>
                </div>
                <div className="w-px h-10" style={{ background: "var(--color-border)" }} />
                <div>
                  <div className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>{assessmentResult.correct}/{assessmentResult.total}</div>
                  <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>正确</div>
                </div>
              </div>
              <button
                onClick={() => setStep("goals")}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white"
                style={{ background: "var(--color-primary)" }}
              >
                下一步：设定目标
              </button>
            </div>
          )}

          {step === "goals" && assessmentResult && (
            <GoalsStep cefrLevel={assessmentResult.cefr_level} onComplete={handleGoalsComplete} />
          )}

          {step === "path" && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--color-text)" }}>你的专属学习路径</h3>
              <div className="rounded-xl p-4 mb-6 text-left" style={{ background: "var(--color-primary-light, #dbeafe)" }}>
                <div className="space-y-2">
                  {recommendedPath.split("→").map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
                        style={{ background: "var(--color-primary)" }}
                      >
                        {i + 1}
                      </div>
                      <span className="text-sm" style={{ color: "var(--color-text)" }}>{step.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={handleFinish}
                className="w-full py-2.5 rounded-lg text-sm font-medium text-white"
                style={{ background: "var(--color-primary)" }}
              >
                开始学习
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
