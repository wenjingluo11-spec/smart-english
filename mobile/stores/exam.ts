import { create } from "zustand";
import { api } from "../lib/api";
import type {
  ExamProfile, SectionMastery, DiagnosticQuestion, MockExamData,
  WeaknessItem, BreakthroughDetail, TrainingQuestion, FlowQuestion,
  ErrorGene, ReplayData, SprintPlan,
} from "../lib/types";

interface ExamState {
  profile: ExamProfile | null;
  mastery: SectionMastery[];
  diagnosticQuestions: DiagnosticQuestion[];
  diagnosticResult: Record<string, unknown> | null;
  mockData: MockExamData | null;
  mockResult: Record<string, unknown> | null;
  weaknesses: WeaknessItem[];
  breakthroughDetail: BreakthroughDetail | null;
  trainingSections: string[];
  trainingQuestions: TrainingQuestion[];
  flowQuestions: FlowQuestion[];
  flowStats: Record<string, unknown> | null;
  errorGenes: ErrorGene[];
  replayData: ReplayData | null;
  sprintPlan: SprintPlan | null;
  loading: boolean;
  // Profile
  fetchProfile: () => Promise<void>;
  createProfile: (data: { exam_type: string; province: string; target_score: number; exam_date: string }) => Promise<void>;
  // Mastery
  fetchMastery: () => Promise<void>;
  // Diagnostic
  startDiagnostic: () => Promise<void>;
  submitDiagnostic: (answers: { section: string; question: string; answer: string; knowledge_point_id: number | null }[]) => Promise<void>;
  // Mock
  startMock: () => Promise<void>;
  submitMock: (mockId: number, answers: Record<string, string>, timeUsed: number) => Promise<void>;
  // Weakness
  fetchWeaknesses: () => Promise<void>;
  startBreakthrough: (knowledgePointId: number) => Promise<void>;
  submitBreakthroughExercise: (breakthroughId: number, index: number, answer: string) => Promise<Record<string, unknown>>;
  // Training
  fetchTrainingSections: () => Promise<void>;
  fetchTrainingQuestions: (section: string) => Promise<void>;
  submitTraining: (questionId: number, answer: string) => Promise<Record<string, unknown>>;
  // Flow
  startFlow: () => Promise<void>;
  submitFlow: (questionId: number, answer: string) => Promise<Record<string, unknown>>;
  endFlow: () => Promise<Record<string, unknown>>;
  // Error Genes
  fetchErrorGenes: () => Promise<void>;
  submitGeneFix: (geneId: string, exerciseIndex: number, answer: string) => Promise<Record<string, unknown>>;
  // Replay
  fetchReplayData: () => Promise<void>;
  // Sprint
  fetchSprintPlan: () => Promise<void>;
  completeSprintTask: (taskIndex: number) => Promise<Record<string, unknown>>;
}

export const useExamStore = create<ExamState>((set, get) => ({
  profile: null,
  mastery: [],
  diagnosticQuestions: [],
  diagnosticResult: null,
  mockData: null,
  mockResult: null,
  weaknesses: [],
  breakthroughDetail: null,
  trainingSections: [],
  trainingQuestions: [],
  flowQuestions: [],
  flowStats: null,
  errorGenes: [],
  replayData: null,
  sprintPlan: null,
  loading: false,

  fetchProfile: async () => {
    try {
      const data = await api.get<ExamProfile>("/exam/profile");
      set({ profile: data });
    } catch { /* ignore */ }
  },

  createProfile: async (data) => {
    const profile = await api.post<ExamProfile>("/exam/profile", data);
    set({ profile });
  },

  fetchMastery: async () => {
    try {
      const data = await api.get<{ section_masteries: SectionMastery[] }>("/exam/dashboard");
      set({ mastery: data.section_masteries || [] });
    } catch { /* ignore */ }
  },

  startDiagnostic: async () => {
    set({ loading: true });
    try {
      const data = await api.post<{ questions: DiagnosticQuestion[] }>("/exam/diagnostic/start", {});
      set({ diagnosticQuestions: data.questions, diagnosticResult: null });
    } catch { /* ignore */ }
    set({ loading: false });
  },

  submitDiagnostic: async (answers) => {
    set({ loading: true });
    try {
      const data = await api.post<Record<string, unknown>>("/exam/diagnostic/submit", { answers });
      set({ diagnosticResult: data });
      get().fetchProfile();
      get().fetchMastery();
    } catch { /* ignore */ }
    set({ loading: false });
  },

  startMock: async () => {
    set({ loading: true, mockResult: null });
    try {
      const data = await api.post<MockExamData>("/exam/mock/start", {});
      set({ mockData: data });
    } catch { /* ignore */ }
    set({ loading: false });
  },

  submitMock: async (mockId, answers, timeUsed) => {
    set({ loading: true });
    try {
      const data = await api.post<Record<string, unknown>>("/exam/mock/submit", {
        mock_id: mockId, answers, time_used: timeUsed,
      });
      set({ mockResult: data, mockData: null });
      get().fetchProfile();
    } catch { /* ignore */ }
    set({ loading: false });
  },

  fetchWeaknesses: async () => {
    try {
      const data = await api.get<WeaknessItem[]>("/exam/weakness/list");
      set({ weaknesses: data });
    } catch { /* ignore */ }
  },

  startBreakthrough: async (knowledgePointId) => {
    set({ loading: true });
    try {
      const data = await api.post<BreakthroughDetail>(`/exam/weakness/breakthrough/${knowledgePointId}`, {});
      set({ breakthroughDetail: data });
    } catch { /* ignore */ }
    set({ loading: false });
  },

  submitBreakthroughExercise: async (breakthroughId, index, answer) => {
    const res = await api.post<Record<string, unknown>>("/exam/weakness/exercise", {
      breakthrough_id: breakthroughId, exercise_index: index, answer,
    });
    if (res.phase_completed) {
      get().fetchWeaknesses();
    }
    return res;
  },

  fetchTrainingSections: async () => {
    try {
      const data = await api.get<string[]>("/exam/training/sections");
      set({ trainingSections: data });
    } catch { /* ignore */ }
  },

  fetchTrainingQuestions: async (section) => {
    set({ loading: true });
    try {
      const data = await api.get<TrainingQuestion[]>(`/exam/training/questions?section=${encodeURIComponent(section)}`);
      set({ trainingQuestions: data });
    } catch { /* ignore */ }
    set({ loading: false });
  },

  submitTraining: async (questionId, answer) => {
    return api.post<Record<string, unknown>>("/exam/training/submit", { question_id: questionId, answer });
  },

  startFlow: async () => {
    set({ loading: true, flowStats: null });
    try {
      const data = await api.post<{ questions: FlowQuestion[] }>("/exam/flow/start", {});
      set({ flowQuestions: data.questions });
    } catch { /* ignore */ }
    set({ loading: false });
  },

  submitFlow: async (questionId, answer) => {
    return api.post<Record<string, unknown>>("/exam/flow/submit", { question_id: questionId, answer });
  },

  endFlow: async () => {
    const data = await api.post<Record<string, unknown>>("/exam/flow/end", {});
    set({ flowStats: data, flowQuestions: [] });
    return data;
  },

  fetchErrorGenes: async () => {
    try {
      const data = await api.get<ErrorGene[]>("/exam/error-genes");
      set({ errorGenes: data });
    } catch { /* ignore */ }
  },

  submitGeneFix: async (geneId, exerciseIndex, answer) => {
    return api.post<Record<string, unknown>>("/exam/error-genes/fix", {
      gene_id: geneId, exercise_index: exerciseIndex, answer,
    });
  },

  fetchReplayData: async () => {
    set({ loading: true });
    try {
      const data = await api.get<ReplayData>("/exam/replay");
      set({ replayData: data });
    } catch { /* ignore */ }
    set({ loading: false });
  },

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
    return res;
  },
}));
