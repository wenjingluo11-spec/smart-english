import { create } from "zustand";
import { api } from "@/lib/api";

interface ExamProfile {
  id: number;
  exam_type: string;
  province: string;
  target_score: number;
  exam_date: string;
  current_estimated_score: number;
  plan_json: Record<string, unknown> | null;
}

interface SectionMastery {
  section: string;
  label: string;
  mastery: number;
  total_points: number;
  practiced_points: number;
}

interface DiagnosticQuestion {
  section: string;
  question: string;
  options: string[];
  answer: string;
  difficulty: number;
  knowledge_point_id: number | null;
}

interface MockQuestion {
  id: number;
  content: string;
  options: string[];
  passage_text?: string;
  difficulty: number;
  passage_group?: string;
  passage_index?: number;
}

interface PassageGroup {
  group_id: string | null;
  questions: MockQuestion[];
}

interface MockSection {
  section: string;
  label: string;
  questions: MockQuestion[];
  passage_groups: PassageGroup[];
  question_count: number;
  score: number;
  time_limit: number;
  part?: number;
  section_num?: number;
  instruction?: string;
  per_score?: number;
}

interface MockExamData {
  mock_id: number;
  exam_type: string;
  time_limit_minutes: number;
  sections: MockSection[];
}

interface WeaknessItem {
  id: number | null;
  knowledge_point_id: number;
  section: string;
  category: string;
  name: string;
  mastery: number;
  frequency: string;
  priority: number;
  status: string;
  phase: number;
}

interface BreakthroughDetail {
  id: number;
  knowledge_point_id: number;
  name: string;
  status: string;
  phase: number;
  micro_lesson_json: Record<string, unknown> | null;
  exercises_json: { question: string; options?: string[]; answer: string; explanation: string; phase: number; completed?: boolean; correct?: boolean }[] | null;
  total_exercises: number;
  completed_exercises: number;
  mastery_before: number;
  mastery_after: number | null;
}

interface ScorePrediction {
  predicted_score: number;
  confidence: number;
  section_predictions: Record<string, { label: string; predicted: number; max: number; mastery: number }>;
  factors: { strengths: string[]; risks: string[]; recommendations: string[] };
  created_at: string;
}

interface KnowledgePoint {
  id: number;
  section: string;
  category: string;
  name: string;
  difficulty: number;
  frequency: string;
  mastery: number;
}

// ── 心流刷题 ──
interface FlowQuestion {
  id: number;
  content: string;
  options: string[];
  passage_text?: string;
  difficulty: number;
}

interface FlowState {
  session_id: number;
  streak: number;
  max_streak: number;
  difficulty: number;
  question: FlowQuestion | null;
}

interface FlowReport {
  session_id: number;
  total_questions: number;
  correct_count: number;
  accuracy: number;
  max_streak: number;
  avg_response_ms: number;
  xp_earned: number;
  duration_seconds: number;
  difficulty_curve: { q: number; d: number; correct: boolean }[];
}

// ── 时间沙漏 ──
interface TimeRecord {
  id: number;
  session_type: string;
  on_budget_rate: number;
  created_at: string | null;
  time_data: { question_id: number; section: string; budget_seconds: number; actual_seconds: number; is_correct: boolean }[];
}

// ── 错题基因 ──
interface ErrorGene {
  id: number;
  pattern_key: string;
  pattern_description: string;
  section: string;
  status: string;
  example_ids: number[];
  fix_attempts: number;
  fix_correct: number;
  fix_exercises: { question: string; options: string[]; answer: string; explanation: string }[] | null;
  created_at: string | null;
}

// ── AI 出题官 ──
interface CustomQuiz {
  session_id: number;
  section: string;
  section_label: string;
  difficulty: number;
  questions: { question: string; options: string[]; answer: string; explanation: string }[];
  total: number;
}

// ── 每日冲刺 ──
interface SprintTask {
  type: string;
  section?: string;
  title: string;
  description: string;
  estimated_minutes: number;
  xp_reward: number;
  reason: string;
  completed?: boolean;
}

interface SprintPlan {
  id: number;
  plan_date: string;
  tasks: SprintTask[];
  total_count: number;
  completed_count: number;
  is_completed: boolean;
  motivation?: string;
  days_remaining?: number;
}

// ── 考场复盘 ──
interface ReplayData {
  exam_type: string;
  target_score: number;
  exam_date: string;
  chapters: { week: string; mock_count: number; best_score: number; max_score: number; scores: Record<string, unknown>[] }[];
  current_masteries: Record<string, number>;
  milestones: { date: string; event: string; type: string }[];
  narrative: string;
  projection: { predicted_score: number; confidence: number; target_score: number; gap: number } | null;
  total_mocks: number;
  mock_scores: { date: string; total: number; max: number }[];
}

interface TrainingQuestion {
  id: number;
  section: string;
  difficulty: number;
  content: string;
  passage_text?: string;
  options: string[];
  knowledge_point_id: number | null;
  strategy_tip: string;
}

interface ExamState {
  profile: ExamProfile | null;
  daysRemaining: number | null;
  sectionMasteries: SectionMastery[];
  recentMockScores: { id: number; total: number; max: number; completed_at: string }[];
  weakCount: number;

  diagnosticSessionId: number | null;
  diagnosticQuestions: DiagnosticQuestion[];
  diagnosticResult: Record<string, unknown> | null;

  trainingQuestions: TrainingQuestion[];
  knowledgePoints: KnowledgePoint[];

  currentMock: MockExamData | null;
  mockResult: Record<string, unknown> | null;
  mockHistory: Record<string, unknown>[];

  weaknesses: WeaknessItem[];
  currentBreakthrough: BreakthroughDetail | null;

  prediction: ScorePrediction | null;
  predictionHistory: ScorePrediction[];

  // 新功能状态
  flowState: FlowState | null;
  flowReport: FlowReport | null;
  flowHistory: FlowReport[];
  timeHistory: TimeRecord[];
  timeAnalysis: Record<string, unknown> | null;
  errorGenes: ErrorGene[];
  currentCustomQuiz: CustomQuiz | null;
  customHistory: Record<string, unknown>[];
  sprintPlan: SprintPlan | null;
  replayData: ReplayData | null;

  loading: boolean;

  // Actions
  fetchProfile: () => Promise<void>;
  createProfile: (data: { exam_type: string; province: string; target_score: number; exam_date: string }) => Promise<void>;
  fetchDashboard: () => Promise<void>;

  startDiagnostic: (examType: string) => Promise<void>;
  submitDiagnostic: (answers: { index: number; student_answer: string; time_spent_seconds: number }[]) => Promise<void>;
  fetchDiagnosticResult: (sessionId: number) => Promise<void>;
  generatePlan: (sessionId: number) => Promise<void>;

  fetchTrainingSections: () => Promise<void>;
  fetchTrainingQuestions: (section: string, limit?: number) => Promise<void>;
  submitTrainingAnswer: (questionId: number, answer: string) => Promise<Record<string, unknown>>;
  fetchKnowledgePoints: (section?: string) => Promise<void>;

  startMock: (examType?: string) => Promise<void>;
  submitMock: (answers: { question_id: number; answer: string; time_spent: number }[]) => Promise<void>;
  fetchMockResult: (mockId: number) => Promise<void>;
  fetchMockHistory: () => Promise<void>;

  fetchWeaknesses: () => Promise<void>;
  startBreakthrough: (kpId: number) => Promise<void>;
  submitBreakthroughExercise: (breakthroughId: number, index: number, answer: string) => Promise<Record<string, unknown>>;

  fetchPrediction: () => Promise<void>;
  fetchPredictionHistory: () => Promise<void>;

  // 心流刷题
  startFlow: (section: string) => Promise<void>;
  submitFlowAnswer: (questionId: number, answer: string, responseMs: number) => Promise<Record<string, unknown>>;
  endFlow: () => Promise<void>;
  fetchFlowHistory: () => Promise<void>;

  // 时间沙漏
  recordTime: (sessionType: string, sessionId: number, entries: Record<string, unknown>[]) => Promise<void>;
  fetchTimeHistory: () => Promise<void>;
  fetchTimeAnalysis: () => Promise<void>;

  // 错题基因
  fetchErrorGenes: () => Promise<void>;
  analyzeErrorGenes: () => Promise<void>;
  generateGeneFix: (geneId: number) => Promise<void>;
  submitGeneFix: (geneId: number, index: number, answer: string) => Promise<Record<string, unknown>>;

  // AI 出题官
  generateCustomQuiz: (prompt: string) => Promise<void>;
  submitCustomQuiz: (answers: { index: number; answer: string }[]) => Promise<Record<string, unknown>>;
  fetchCustomHistory: () => Promise<void>;

  // 每日冲刺
  fetchSprintPlan: () => Promise<void>;
  completeSprintTask: (taskIndex: number) => Promise<Record<string, unknown>>;

  // 考场复盘
  fetchReplayData: () => Promise<void>;
}

export const useExamStore = create<ExamState>((set, get) => ({
  profile: null,
  daysRemaining: null,
  sectionMasteries: [],
  recentMockScores: [],
  weakCount: 0,
  diagnosticSessionId: null,
  diagnosticQuestions: [],
  diagnosticResult: null,
  trainingQuestions: [],
  knowledgePoints: [],
  currentMock: null,
  mockResult: null,
  mockHistory: [],
  weaknesses: [],
  currentBreakthrough: null,
  prediction: null,
  predictionHistory: [],
  flowState: null,
  flowReport: null,
  flowHistory: [],
  timeHistory: [],
  timeAnalysis: null,
  errorGenes: [],
  currentCustomQuiz: null,
  customHistory: [],
  sprintPlan: null,
  replayData: null,
  loading: false,

  fetchProfile: async () => {
    try {
      const data = await api.get<ExamProfile | null>("/exam/profile");
      set({ profile: data });
    } catch { /* ignore */ }
  },

  createProfile: async (data) => {
    const profile = await api.post<ExamProfile>("/exam/profile", data);
    set({ profile });
  },

  fetchDashboard: async () => {
    set({ loading: true });
    try {
      const data = await api.get<{
        profile: ExamProfile | null;
        days_remaining: number | null;
        section_masteries: SectionMastery[];
        recent_mock_scores: { id: number; total: number; max: number; completed_at: string }[];
        weak_count: number;
      }>("/exam/dashboard");
      set({
        profile: data.profile,
        daysRemaining: data.days_remaining,
        sectionMasteries: data.section_masteries || [],
        recentMockScores: data.recent_mock_scores || [],
        weakCount: data.weak_count || 0,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  startDiagnostic: async (examType) => {
    set({ loading: true });
    try {
      const data = await api.post<{ session_id: number; questions: DiagnosticQuestion[] }>("/exam/diagnostic/start", { exam_type: examType });
      set({ diagnosticSessionId: data.session_id, diagnosticQuestions: data.questions, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  submitDiagnostic: async (answers) => {
    const { diagnosticSessionId } = get();
    if (!diagnosticSessionId) return;
    set({ loading: true });
    try {
      const data = await api.post<Record<string, unknown>>("/exam/diagnostic/submit", { session_id: diagnosticSessionId, answers });
      set({ diagnosticResult: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchDiagnosticResult: async (sessionId) => {
    try {
      const data = await api.get<Record<string, unknown>>(`/exam/diagnostic/result/${sessionId}`);
      set({ diagnosticResult: data });
    } catch { /* ignore */ }
  },

  generatePlan: async (sessionId) => {
    set({ loading: true });
    try {
      const data = await api.post<{ plan: Record<string, unknown> }>("/exam/diagnostic/generate-plan", { session_id: sessionId });
      const { profile } = get();
      if (profile && data.plan) {
        set({ profile: { ...profile, plan_json: data.plan }, loading: false });
      } else {
        set({ loading: false });
      }
    } catch {
      set({ loading: false });
    }
  },

  fetchTrainingSections: async () => {
    const { profile } = get();
    if (!profile) return;
    try {
      const data = await api.get<SectionMastery[]>(`/exam/training/sections?exam_type=${profile.exam_type}`);
      set({ sectionMasteries: data });
    } catch { /* ignore */ }
  },

  fetchTrainingQuestions: async (section, limit = 5) => {
    const { profile } = get();
    if (!profile) return;
    set({ loading: true });
    try {
      const data = await api.get<TrainingQuestion[]>(`/exam/training/${section}/questions?exam_type=${profile.exam_type}&limit=${limit}`);
      set({ trainingQuestions: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  submitTrainingAnswer: async (questionId, answer) => {
    const res = await api.post<Record<string, unknown>>("/exam/training/submit", { question_id: questionId, answer });
    return res;
  },

  fetchKnowledgePoints: async (section) => {
    const { profile } = get();
    if (!profile) return;
    try {
      let url = `/exam/training/knowledge-points?exam_type=${profile.exam_type}`;
      if (section) url += `&section=${section}`;
      const data = await api.get<KnowledgePoint[]>(url);
      set({ knowledgePoints: data });
    } catch { /* ignore */ }
  },

  startMock: async (examType) => {
    set({ loading: true, mockResult: null });
    try {
      const body: Record<string, string> = {};
      if (examType) body.exam_type = examType;
      const data = await api.post<MockExamData>("/exam/mock/start", body);
      set({ currentMock: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  submitMock: async (answers) => {
    const { currentMock } = get();
    if (!currentMock) return;
    set({ loading: true });
    try {
      const data = await api.post<Record<string, unknown>>("/exam/mock/submit", { mock_id: currentMock.mock_id, answers });
      set({ mockResult: data, currentMock: null, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchMockResult: async (mockId) => {
    try {
      const data = await api.get<Record<string, unknown>>(`/exam/mock/result/${mockId}`);
      set({ mockResult: data });
    } catch { /* ignore */ }
  },

  fetchMockHistory: async () => {
    try {
      const data = await api.get<Record<string, unknown>[]>("/exam/mock/history");
      set({ mockHistory: data });
    } catch { /* ignore */ }
  },

  fetchWeaknesses: async () => {
    try {
      const data = await api.get<WeaknessItem[]>("/exam/weakness/list");
      set({ weaknesses: data });
    } catch { /* ignore */ }
  },

  startBreakthrough: async (kpId) => {
    set({ loading: true });
    try {
      const data = await api.post<BreakthroughDetail>(`/exam/weakness/start/${kpId}`, {});
      set({ currentBreakthrough: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  submitBreakthroughExercise: async (breakthroughId, index, answer) => {
    const res = await api.post<Record<string, unknown>>("/exam/weakness/exercise", {
      breakthrough_id: breakthroughId, exercise_index: index, answer,
    });
    if (res.status === "completed") {
      set({ currentBreakthrough: null });
      get().fetchWeaknesses();
    }
    return res;
  },

  fetchPrediction: async () => {
    try {
      const data = await api.get<ScorePrediction>("/exam/prediction");
      set({ prediction: data });
    } catch { /* ignore */ }
  },

  fetchPredictionHistory: async () => {
    try {
      const data = await api.get<ScorePrediction[]>("/exam/prediction/history");
      set({ predictionHistory: data });
    } catch { /* ignore */ }
  },

  // ── 心流刷题 ──

  startFlow: async (section) => {
    set({ loading: true, flowReport: null });
    try {
      const data = await api.post<FlowState>("/exam/flow/start", { section });
      set({ flowState: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  submitFlowAnswer: async (questionId, answer, responseMs) => {
    const state = get().flowState;
    if (!state) return {};
    const res = await api.post<Record<string, unknown>>("/exam/flow/answer", {
      session_id: state.session_id, question_id: questionId, answer, response_ms: responseMs,
    });
    if (res.next_question) {
      set({
        flowState: {
          ...state,
          streak: (res.streak as number) ?? 0,
          max_streak: (res.max_streak as number) ?? 0,
          difficulty: (res.difficulty as number) ?? state.difficulty,
          question: res.next_question as FlowQuestion,
        },
      });
    }
    return res;
  },

  endFlow: async () => {
    const state = get().flowState;
    if (!state) return;
    try {
      const data = await api.post<FlowReport>("/exam/flow/end", { session_id: state.session_id });
      set({ flowReport: data, flowState: null });
    } catch { /* ignore */ }
  },

  fetchFlowHistory: async () => {
    try {
      const data = await api.get<FlowReport[]>("/exam/flow/history");
      set({ flowHistory: data });
    } catch { /* ignore */ }
  },

  // ── 时间沙漏 ──

  recordTime: async (sessionType, sessionId, entries) => {
    try {
      await api.post("/exam/time/record", {
        session_type: sessionType, session_id: sessionId, time_entries: entries,
      });
    } catch { /* ignore */ }
  },

  fetchTimeHistory: async () => {
    try {
      const data = await api.get<TimeRecord[]>("/exam/time/history");
      set({ timeHistory: data });
    } catch { /* ignore */ }
  },

  fetchTimeAnalysis: async () => {
    try {
      const data = await api.get<Record<string, unknown>>("/exam/time/analysis");
      set({ timeAnalysis: data });
    } catch { /* ignore */ }
  },

  // ── 错题基因 ──

  fetchErrorGenes: async () => {
    try {
      const data = await api.get<ErrorGene[]>("/exam/error-genes");
      set({ errorGenes: data });
    } catch { /* ignore */ }
  },

  analyzeErrorGenes: async () => {
    set({ loading: true });
    try {
      const data = await api.post<ErrorGene[]>("/exam/error-genes/analyze", {});
      set({ errorGenes: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  generateGeneFix: async (geneId) => {
    set({ loading: true });
    try {
      const data = await api.post<{ exercises: ErrorGene["fix_exercises"] }>(`/exam/error-genes/${geneId}/fix`, {});
      // 更新对应基因的 fix_exercises
      const genes = get().errorGenes.map((g) =>
        g.id === geneId ? { ...g, fix_exercises: data.exercises, status: "improving" } : g
      );
      set({ errorGenes: genes, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  submitGeneFix: async (geneId, index, answer) => {
    const res = await api.post<Record<string, unknown>>("/exam/error-genes/submit", {
      gene_id: geneId, exercise_index: index, answer,
    });
    if (res.gene_status) {
      const genes = get().errorGenes.map((g) =>
        g.id === geneId ? { ...g, status: res.gene_status as string, fix_attempts: (res.fix_attempts as number) ?? g.fix_attempts, fix_correct: (res.fix_correct as number) ?? g.fix_correct } : g
      );
      set({ errorGenes: genes });
    }
    return res;
  },

  // ── AI 出题官 ──

  generateCustomQuiz: async (prompt) => {
    set({ loading: true, currentCustomQuiz: null });
    try {
      const data = await api.post<CustomQuiz>("/exam/custom/generate", { prompt });
      set({ currentCustomQuiz: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  submitCustomQuiz: async (answers) => {
    const quiz = get().currentCustomQuiz;
    if (!quiz) return {};
    const res = await api.post<Record<string, unknown>>("/exam/custom/submit", {
      session_id: quiz.session_id, answers,
    });
    return res;
  },

  fetchCustomHistory: async () => {
    try {
      const data = await api.get<Record<string, unknown>[]>("/exam/custom/history");
      set({ customHistory: data });
    } catch { /* ignore */ }
  },

  // ── 每日冲刺 ──

  fetchSprintPlan: async () => {
    try {
      const data = await api.get<SprintPlan>("/exam/sprint-plan/today");
      set({ sprintPlan: data });
    } catch { /* ignore */ }
  },

  completeSprintTask: async (taskIndex) => {
    const plan = get().sprintPlan;
    if (!plan) return {};
    const res = await api.post<Record<string, unknown>>("/exam/sprint-plan/complete-task", {
      plan_id: plan.id, task_index: taskIndex,
    });
    // 更新本地状态
    if (plan) {
      const tasks = [...plan.tasks];
      tasks[taskIndex] = { ...tasks[taskIndex], completed: true };
      set({
        sprintPlan: {
          ...plan,
          tasks,
          completed_count: (res.completed_count as number) ?? plan.completed_count + 1,
          is_completed: (res.all_done as boolean) ?? false,
        },
      });
    }
    return res;
  },

  // ── 考场复盘 ──

  fetchReplayData: async () => {
    set({ loading: true });
    try {
      const data = await api.get<ReplayData>("/exam/replay");
      set({ replayData: data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
