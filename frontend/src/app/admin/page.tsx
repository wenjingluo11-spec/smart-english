"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import PageTransition from "@/components/ui/page-transition";

interface AdminStats {
  users: number;
  textbooks: number;
  units: number;
  grammar_topics: number;
  grammar_exercises: number;
  readings: number;
}

interface CognitiveGainReport {
  window_days: number;
  from_date: string;
  summary: {
    avg_tqi: number;
    tqi_samples: number;
    avg_reflection_quality: number;
    reflection_count: number;
    hint_dependency_rate: number;
    independent_solve_rate: number;
    cognitive_gain: number;
  };
  daily: {
    tqi: { date: string; avg_tqi: number; samples: number }[];
    reflection: { date: string; avg_reflection: number; count: number }[];
  };
}

type Tab = "dashboard" | "textbook" | "grammar" | "reading" | "orchestration";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [cognitiveGain, setCognitiveGain] = useState<CognitiveGainReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Form states
  const [tbForm, setTbForm] = useState({ name: "", publisher: "人教版", grade: "七年级", semester: "上" });
  const [unitForm, setUnitForm] = useState({ textbook_id: "", unit_number: "", title: "", topic: "", vocabulary: "", grammar_points: "", key_sentences: "" });
  const [grammarForm, setGrammarForm] = useState({ category: "时态", name: "", difficulty: "1", cefr_level: "A1", explanation: "", examples: "", tips: "" });
  const [exerciseForm, setExerciseForm] = useState({ topic_id: "", content: "", options: "", answer: "", explanation: "", exercise_type: "choice" });
  const [readingForm, setReadingForm] = useState({ title: "", content: "", cefr_level: "A2", grade: "", questions: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get<AdminStats>("/admin/stats").then(setStats).catch((e) => setError(e.message || "无权限"));
  }, []);

  useEffect(() => {
    if (tab !== "orchestration") return;
    api.get<CognitiveGainReport>("/stats/cognitive-gain?days=14")
      .then(setCognitiveGain)
      .catch(() => setCognitiveGain(null));
  }, [tab]);

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const handleCreateTextbook = async () => {
    setLoading(true);
    try {
      await api.post("/admin/textbooks", tbForm);
      showMsg("教材创建成功");
      setTbForm({ name: "", publisher: "人教版", grade: "七年级", semester: "上" });
      api.get<AdminStats>("/admin/stats").then(setStats);
    } catch { showMsg("创建失败"); }
    setLoading(false);
  };

  const handleCreateUnit = async () => {
    setLoading(true);
    try {
      await api.post("/admin/units", {
        textbook_id: Number(unitForm.textbook_id),
        unit_number: Number(unitForm.unit_number),
        title: unitForm.title,
        topic: unitForm.topic,
        vocabulary_json: unitForm.vocabulary ? unitForm.vocabulary.split(",").map((s) => s.trim()) : null,
        grammar_points_json: unitForm.grammar_points ? unitForm.grammar_points.split(",").map((s) => s.trim()) : null,
        key_sentences_json: unitForm.key_sentences ? unitForm.key_sentences.split("\n").filter(Boolean) : null,
      });
      showMsg("单元创建成功");
      api.get<AdminStats>("/admin/stats").then(setStats);
    } catch { showMsg("创建失败"); }
    setLoading(false);
  };

  const handleCreateGrammar = async () => {
    setLoading(true);
    try {
      await api.post("/admin/grammar-topics", {
        ...grammarForm,
        difficulty: Number(grammarForm.difficulty),
        examples_json: grammarForm.examples ? grammarForm.examples.split("\n").filter(Boolean) : null,
        tips_json: grammarForm.tips ? grammarForm.tips.split("\n").filter(Boolean) : null,
      });
      showMsg("语法知识点创建成功");
      api.get<AdminStats>("/admin/stats").then(setStats);
    } catch { showMsg("创建失败"); }
    setLoading(false);
  };

  const handleCreateExercise = async () => {
    setLoading(true);
    try {
      await api.post("/admin/grammar-exercises", {
        topic_id: Number(exerciseForm.topic_id),
        content: exerciseForm.content,
        options_json: exerciseForm.options ? exerciseForm.options.split("\n").filter(Boolean) : null,
        answer: exerciseForm.answer,
        explanation: exerciseForm.explanation,
        exercise_type: exerciseForm.exercise_type,
      });
      showMsg("练习题创建成功");
      api.get<AdminStats>("/admin/stats").then(setStats);
    } catch { showMsg("创建失败"); }
    setLoading(false);
  };

  const handleCreateReading = async () => {
    setLoading(true);
    try {
      let questions_json = null;
      if (readingForm.questions.trim()) {
        try { questions_json = JSON.parse(readingForm.questions); } catch { /* ignore */ }
      }
      await api.post("/admin/readings", {
        title: readingForm.title,
        content: readingForm.content,
        cefr_level: readingForm.cefr_level,
        grade: readingForm.grade,
        word_count: readingForm.content.split(/\s+/).length,
        questions_json,
      });
      showMsg("阅读材料创建成功");
      setReadingForm({ title: "", content: "", cefr_level: "A2", grade: "", questions: "" });
      api.get<AdminStats>("/admin/stats").then(setStats);
    } catch { showMsg("创建失败"); }
    setLoading(false);
  };

  if (error) {
    return (
      <PageTransition>
        <div className="max-w-3xl text-center py-16">
          <div className="text-4xl mb-3">🔒</div>
          <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{error}</div>
        </div>
      </PageTransition>
    );
  }

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none";
  const inputStyle = { borderColor: "var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)" };
  const btnCls = "px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-30";

  return (
    <PageTransition>
      <div className="max-w-4xl">
        {msg && (
          <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm text-white bg-green-500 shadow-lg animate-slide-up">
            {msg}
          </div>
        )}

        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--color-text)" }}>内容管理后台</h2>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: "var(--color-border)" }}>
          {([
            { key: "dashboard", label: "概览" },
            { key: "textbook", label: "教材" },
            { key: "grammar", label: "语法" },
            { key: "reading", label: "阅读" },
            { key: "orchestration", label: "认知编排" },
          ] as { key: Tab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 text-sm py-1.5 rounded-md transition-all ${tab === t.key ? "font-medium shadow-sm" : ""}`}
              style={{
                background: tab === t.key ? "var(--color-surface)" : "transparent",
                color: tab === t.key ? "var(--color-primary)" : "var(--color-text-secondary)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {tab === "dashboard" && stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "用户数", value: stats.users, icon: "👥" },
              { label: "教材", value: stats.textbooks, icon: "📚" },
              { label: "单元", value: stats.units, icon: "📖" },
              { label: "语法知识点", value: stats.grammar_topics, icon: "📝" },
              { label: "语法练习题", value: stats.grammar_exercises, icon: "✏️" },
              { label: "阅读材料", value: stats.readings, icon: "📰" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border p-4 text-center" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xl font-bold" style={{ color: "var(--color-primary)" }}>{s.value}</div>
                <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Textbook management */}
        {tab === "textbook" && (
          <div className="space-y-4">
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>添加教材</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input className={inputCls} style={inputStyle} placeholder="教材名称" value={tbForm.name} onChange={(e) => setTbForm({ ...tbForm, name: e.target.value })} />
                <select className={inputCls} style={inputStyle} value={tbForm.publisher} onChange={(e) => setTbForm({ ...tbForm, publisher: e.target.value })}>
                  {["人教版", "外研版", "北师大版", "译林版", "冀教版"].map((p) => <option key={p}>{p}</option>)}
                </select>
                <select className={inputCls} style={inputStyle} value={tbForm.grade} onChange={(e) => setTbForm({ ...tbForm, grade: e.target.value })}>
                  {["七年级", "八年级", "九年级", "高一", "高二", "高三"].map((g) => <option key={g}>{g}</option>)}
                </select>
                <select className={inputCls} style={inputStyle} value={tbForm.semester} onChange={(e) => setTbForm({ ...tbForm, semester: e.target.value })}>
                  <option value="上">上册</option>
                  <option value="下">下册</option>
                </select>
              </div>
              <button onClick={handleCreateTextbook} disabled={loading || !tbForm.name} className={btnCls} style={{ background: "var(--color-primary)" }}>
                创建教材
              </button>
            </div>

            <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>添加单元</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input className={inputCls} style={inputStyle} placeholder="教材 ID" value={unitForm.textbook_id} onChange={(e) => setUnitForm({ ...unitForm, textbook_id: e.target.value })} />
                <input className={inputCls} style={inputStyle} placeholder="单元序号" value={unitForm.unit_number} onChange={(e) => setUnitForm({ ...unitForm, unit_number: e.target.value })} />
                <input className={inputCls} style={inputStyle} placeholder="单元标题" value={unitForm.title} onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value })} />
                <input className={inputCls} style={inputStyle} placeholder="主题" value={unitForm.topic} onChange={(e) => setUnitForm({ ...unitForm, topic: e.target.value })} />
              </div>
              <textarea className={inputCls + " mb-2"} style={inputStyle} rows={2} placeholder="词汇（逗号分隔）" value={unitForm.vocabulary} onChange={(e) => setUnitForm({ ...unitForm, vocabulary: e.target.value })} />
              <textarea className={inputCls + " mb-2"} style={inputStyle} rows={2} placeholder="语法点（逗号分隔）" value={unitForm.grammar_points} onChange={(e) => setUnitForm({ ...unitForm, grammar_points: e.target.value })} />
              <textarea className={inputCls + " mb-3"} style={inputStyle} rows={2} placeholder="重点句型（每行一个）" value={unitForm.key_sentences} onChange={(e) => setUnitForm({ ...unitForm, key_sentences: e.target.value })} />
              <button onClick={handleCreateUnit} disabled={loading || !unitForm.title} className={btnCls} style={{ background: "var(--color-primary)" }}>
                创建单元
              </button>
            </div>
          </div>
        )}

        {/* Grammar management */}
        {tab === "grammar" && (
          <div className="space-y-4">
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>添加语法知识点</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <select className={inputCls} style={inputStyle} value={grammarForm.category} onChange={(e) => setGrammarForm({ ...grammarForm, category: e.target.value })}>
                  {["时态", "从句", "非谓语", "情态动词", "被动语态", "虚拟语气", "冠词", "介词", "代词", "形容词副词", "名词", "连词", "其他"].map((c) => <option key={c}>{c}</option>)}
                </select>
                <input className={inputCls} style={inputStyle} placeholder="知识点名称" value={grammarForm.name} onChange={(e) => setGrammarForm({ ...grammarForm, name: e.target.value })} />
                <select className={inputCls} style={inputStyle} value={grammarForm.difficulty} onChange={(e) => setGrammarForm({ ...grammarForm, difficulty: e.target.value })}>
                  {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>难度 {d}</option>)}
                </select>
                <select className={inputCls} style={inputStyle} value={grammarForm.cefr_level} onChange={(e) => setGrammarForm({ ...grammarForm, cefr_level: e.target.value })}>
                  {["A1", "A2", "B1", "B2", "C1"].map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <textarea className={inputCls + " mb-2"} style={inputStyle} rows={4} placeholder="语法讲解" value={grammarForm.explanation} onChange={(e) => setGrammarForm({ ...grammarForm, explanation: e.target.value })} />
              <textarea className={inputCls + " mb-2"} style={inputStyle} rows={2} placeholder="例句（每行一个）" value={grammarForm.examples} onChange={(e) => setGrammarForm({ ...grammarForm, examples: e.target.value })} />
              <textarea className={inputCls + " mb-3"} style={inputStyle} rows={2} placeholder="易错提醒（每行一个）" value={grammarForm.tips} onChange={(e) => setGrammarForm({ ...grammarForm, tips: e.target.value })} />
              <button onClick={handleCreateGrammar} disabled={loading || !grammarForm.name} className={btnCls} style={{ background: "var(--color-primary)" }}>
                创建知识点
              </button>
            </div>

            <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>添加练习题</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input className={inputCls} style={inputStyle} placeholder="知识点 ID" value={exerciseForm.topic_id} onChange={(e) => setExerciseForm({ ...exerciseForm, topic_id: e.target.value })} />
                <select className={inputCls} style={inputStyle} value={exerciseForm.exercise_type} onChange={(e) => setExerciseForm({ ...exerciseForm, exercise_type: e.target.value })}>
                  <option value="choice">选择题</option>
                  <option value="fill">填空题</option>
                  <option value="rewrite">改写题</option>
                  <option value="correct">改错题</option>
                </select>
              </div>
              <textarea className={inputCls + " mb-2"} style={inputStyle} rows={2} placeholder="题目内容" value={exerciseForm.content} onChange={(e) => setExerciseForm({ ...exerciseForm, content: e.target.value })} />
              <textarea className={inputCls + " mb-2"} style={inputStyle} rows={3} placeholder="选项（每行一个，如 A. xxx）" value={exerciseForm.options} onChange={(e) => setExerciseForm({ ...exerciseForm, options: e.target.value })} />
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input className={inputCls} style={inputStyle} placeholder="正确答案" value={exerciseForm.answer} onChange={(e) => setExerciseForm({ ...exerciseForm, answer: e.target.value })} />
                <input className={inputCls} style={inputStyle} placeholder="解析" value={exerciseForm.explanation} onChange={(e) => setExerciseForm({ ...exerciseForm, explanation: e.target.value })} />
              </div>
              <button onClick={handleCreateExercise} disabled={loading || !exerciseForm.content} className={btnCls} style={{ background: "var(--color-primary)" }}>
                创建练习题
              </button>
            </div>
          </div>
        )}

        {/* Reading management */}
        {tab === "reading" && (
          <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
            <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>添加阅读材料</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input className={inputCls} style={inputStyle} placeholder="标题" value={readingForm.title} onChange={(e) => setReadingForm({ ...readingForm, title: e.target.value })} />
              <select className={inputCls} style={inputStyle} value={readingForm.cefr_level} onChange={(e) => setReadingForm({ ...readingForm, cefr_level: e.target.value })}>
                {["A1", "A2", "B1", "B2", "C1"].map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <textarea className={inputCls + " mb-2"} style={inputStyle} rows={8} placeholder="文章内容" value={readingForm.content} onChange={(e) => setReadingForm({ ...readingForm, content: e.target.value })} />
            <textarea className={inputCls + " mb-3"} style={inputStyle} rows={4} placeholder='阅读理解题 JSON（可选）&#10;{"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "answer": 0}]}' value={readingForm.questions} onChange={(e) => setReadingForm({ ...readingForm, questions: e.target.value })} />
            <button onClick={handleCreateReading} disabled={loading || !readingForm.title || !readingForm.content} className={btnCls} style={{ background: "var(--color-primary)" }}>
              创建阅读材料
            </button>
          </div>
        )}

        {/* Cognitive orchestration */}
        {tab === "orchestration" && (
          <div className="space-y-4">
            {!cognitiveGain ? (
              <div className="rounded-xl border p-4 text-sm" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-secondary)" }}>
                暂无认知增益数据（请先完成带反思的学习交互）。
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "平均 TQI", value: `${Math.round(cognitiveGain.summary.avg_tqi * 100)}%` },
                    { label: "反思质量", value: `${Math.round(cognitiveGain.summary.avg_reflection_quality * 100)}%` },
                    { label: "提示依赖率", value: `${Math.round(cognitiveGain.summary.hint_dependency_rate * 100)}%` },
                    { label: "认知增益", value: `${Math.round(cognitiveGain.summary.cognitive_gain * 100)}%` },
                  ].map((card) => (
                    <div key={card.label} className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                      <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{card.label}</p>
                      <p className="text-xl font-bold mt-1" style={{ color: "var(--color-primary)" }}>{card.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                  <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>近 14 天 TQI 趋势</h3>
                  {cognitiveGain.daily.tqi.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>暂无样本</p>
                  ) : (
                    <div className="space-y-2">
                      {cognitiveGain.daily.tqi.map((item) => (
                        <div key={item.date} className="flex items-center gap-3">
                          <span className="text-xs w-20" style={{ color: "var(--color-text-secondary)" }}>{item.date}</span>
                          <div className="flex-1 h-2 rounded-full" style={{ background: "var(--color-border)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(2, Math.round(item.avg_tqi * 100))}%`,
                                background: "var(--color-primary)",
                              }}
                            />
                          </div>
                          <span className="text-xs w-14 text-right" style={{ color: "var(--color-text)" }}>
                            {Math.round(item.avg_tqi * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border p-4" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
                  <h3 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>教师干预建议（自动）</h3>
                  <ul className="space-y-2 text-sm" style={{ color: "var(--color-text)" }}>
                    <li>1. 当提示依赖率高于 40% 时，优先安排“先解释后提示”任务。</li>
                    <li>2. 当平均 TQI 低于 50% 时，优先使用 Mirror M0-M1 的澄清探针。</li>
                    <li>3. 当认知增益连续 3 天为负时，降低难度并增加支架式追问。</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
