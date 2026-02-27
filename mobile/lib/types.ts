export interface User {
  id: number;
  phone: string;
  grade_level: string;
  grade: string;
  cefr_level: string;
}

export interface Question {
  id: number;
  topic: string;
  difficulty: number;
  question_type: string;
  content: string;
  options?: string[];
}

export interface SubmitResult {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  // 认知增强字段
  how_to_spot?: string;
  key_clues?: { text: string; role: string }[];
  common_trap?: string;
  method?: string;
  analysis?: {
    key_phrases: { text: string; role: string; importance: string; hint: string }[];
    reading_order: { step: number; target: string; action: string; reason: string }[];
    strategy: string;
    distractors: { option: string; trap: string }[];
  };
}

export interface WritingFeedback {
  id: number;
  score: number | null;
  feedback_json: {
    summary?: string;
    strengths?: string[];
    improvements?: string[];
    corrected_sentences?: {
      original: string;
      corrected: string;
      reason: string;
    }[];
  } | null;
  created_at: string;
}

export interface ReadingMaterial {
  id: number;
  title: string;
  content: string;
  word_count: number;
  cefr_level: string;
}

export interface VocabWord {
  id: number;
  word: string;
  definition: string;
  status: string;
  next_review: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ── Exam ──

export interface ExamProfile {
  id: number;
  exam_type: string;
  province: string;
  target_score: number;
  exam_date: string;
  current_estimated_score: number;
  plan_json: Record<string, unknown> | null;
}

export interface SectionMastery {
  section: string;
  label: string;
  mastery: number;
  total_points: number;
  practiced_points: number;
}

export interface DiagnosticQuestion {
  section: string;
  question: string;
  options: string[];
  answer: string;
  difficulty: number;
  knowledge_point_id: number | null;
}

export interface MockQuestion {
  id: number;
  content: string;
  options: string[];
  passage_text?: string;
  difficulty: number;
  passage_group?: string;
  passage_index?: number;
}

export interface PassageGroup {
  group_id: string | null;
  questions: MockQuestion[];
}

export interface MockSection {
  section: string;
  label: string;
  questions: MockQuestion[];
  passage_groups: PassageGroup[];
  question_count: number;
  score: number;
  time_limit: number;
}

export interface MockExamData {
  mock_id: number;
  exam_type: string;
  time_limit_minutes: number;
  sections: MockSection[];
}

export interface WeaknessItem {
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

export interface BreakthroughDetail {
  id: number;
  knowledge_point_id: number;
  name: string;
  status: string;
  current_phase: number;
  exercises: { type: string; question: string; options?: string[]; answer: string; explanation: string }[];
}

export interface TrainingQuestion {
  id: number;
  content: string;
  options: string[];
  difficulty: number;
  knowledge_point: string;
}

export interface FlowQuestion {
  id: number;
  content: string;
  options: string[];
  difficulty: number;
}

export interface ErrorGene {
  gene_id: string;
  gene_name: string;
  description: string;
  frequency: number;
  severity: string;
  examples: string[];
  fix_exercises: { type: string; question: string; options?: string[]; answer: string; explanation: string }[];
}

export interface ReplayMock {
  mock_id: number;
  exam_type: string;
  total_score: number;
  created_at: string;
}

export interface ReplayQuestion {
  question_id: number;
  content: string;
  options: string[];
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  ai_comment: string;
  section: string;
}

export interface ReplayData {
  mocks: ReplayMock[];
  questions: ReplayQuestion[];
}

export interface SprintPlan {
  id: number;
  date: string;
  tasks: { title: string; type: string; xp: number; completed: boolean }[];
  completed_count: number;
  is_completed: boolean;
}

// ── Errors ──

export interface ErrorEntry {
  id: number;
  source_type: string;
  question_snapshot: string;
  question_type: string;
  topic: string;
  difficulty: number;
  user_answer: string;
  correct_answer: string;
  explanation: string;
  status: string;
  retry_count: number;
  created_at: string;
}

export interface ErrorStats {
  total: number;
  unmastered: number;
  mastered: number;
  by_topic: { topic: string; count: number }[];
  by_type: { type: string; count: number }[];
  recent_trend: { date: string; count: number }[];
}

// ── Clinic ──

export interface ErrorPattern {
  id: number;
  pattern_type: string;
  title: string;
  description: string;
  severity: string;
  evidence_json: Record<string, unknown> | null;
  diagnosis_json: Record<string, unknown> | null;
  status: string;
  created_at: string;
}

export interface TreatmentPlan {
  id: number;
  pattern_id: number;
  exercises_json: { exercises: { type: string; question: string; options?: string[]; answer: string; explanation: string }[] } | null;
  total_exercises: number;
  completed_exercises: number;
  status: string;
}

// ── Grammar ──

export interface GrammarTopic {
  id: number;
  category: string;
  name: string;
  difficulty: number;
  cefr_level: string;
  mastery: number;
  total_attempts: number;
}

export interface GrammarTopicDetail {
  id: number;
  category: string;
  name: string;
  difficulty: number;
  cefr_level: string;
  explanation: string;
  examples: string[];
  tips: string[];
}

export interface GrammarExercise {
  id: number;
  content: string;
  options: string[];
  exercise_type: string;
}

export interface GrammarCategory {
  category: string;
  count: number;
}

// ── XP / Progress / Missions ──

export interface XPData {
  total_xp: number;
  level: number;
  cefr: string;
  xp_for_next: number;
  streak_days: number;
}

export interface ProgressData {
  due_vocab: number;
  today_practice: number;
  writing_count: number;
  error_count: number;
}

export interface Mission {
  id: number;
  mission_type: string;
  title: string;
  target: number;
  progress: number;
  completed: boolean;
  xp_reward: number;
}

// ── Onboarding ──

export interface OnboardingStatus {
  completed: boolean;
  current_step: string | null;
  assessment_score: number | null;
  cefr_level: string | null;
  recommended_path: string | null;
}

// ── Story ──

export interface StoryTemplate {
  id: number;
  title: string;
  genre: string;
  cefr_min: string;
  cefr_max: string;
  synopsis: string;
  cover_emoji: string;
}

export interface StorySession {
  id: number;
  template_id: number;
  template_title: string;
  cover_emoji?: string;
  current_chapter: number;
  total_chapters: number;
  status: string;
  started_at: string;
}

export interface StoryChapter {
  id: number;
  chapter_number: number;
  narrative_text: string;
  choices: { label: string; description: string; next_prompt: string }[] | null;
  challenge: { type: string; question: string; options?: string[]; answer: string; hint?: string; explanation?: string } | null;
  chosen_option: string | null;
  learning_points: { word: string; meaning: string; usage: string }[] | null;
}

// ── Arena ──

export interface BattleMode {
  mode: string;
  name: string;
  description: string;
  rounds: number;
}

export interface Battle {
  id: number;
  mode: string;
  player1_id: number;
  player2_id: number | null;
  status: string;
  rounds: {
    rounds: { round: number; p1_input: string; p2_input: string; p1_score: number; p2_score: number; p1_feedback?: string; p2_feedback?: string }[];
    current_round: number;
    max_rounds: number;
  } | null;
  winner_id: number | null;
  created_at: string;
}

export interface ArenaRating {
  rating: number;
  tier: string;
  wins: number;
  losses: number;
  season: number;
}

export interface LeaderboardEntry {
  user_id: number;
  phone: string;
  rating: number;
  tier: string;
  wins: number;
}

// ── Quests ──

export interface QuestTemplate {
  id: number;
  title: string;
  description: string;
  difficulty: number;
  category: string;
  requirements: Record<string, unknown> | null;
  tips: Record<string, unknown> | null;
  xp_reward: number;
  user_status?: string;
}

export interface UserQuest {
  id: number;
  template_id: number;
  title: string;
  difficulty: number;
  category: string;
  xp_reward: number;
  status: string;
  evidence_url: string | null;
  ai_verification: Record<string, unknown> | null;
  started_at: string;
  completed_at: string | null;
}

export interface CommunityItem {
  quest_title: string;
  difficulty: number;
  evidence_url: string | null;
  score: number;
  completed_at: string;
}

// ── Textbook ──

export interface Textbook {
  id: number;
  name: string;
  publisher: string;
  grade: string;
  semester: string;
  cover_url: string;
}

export interface TextbookUnit {
  id: number;
  unit_number: number;
  title: string;
  topic: string;
  vocab_count: number;
  grammar_count: number;
}

export interface TextbookUnitDetail {
  id: number;
  unit_number: number;
  title: string;
  topic: string;
  vocabulary: string[];
  grammar_points: string[];
  key_sentences: string[];
}

// ── Galaxy ──

export interface GalaxyNode {
  id: number;
  word: string;
  pos: string;
  definition: string;
  definition_en?: string;
  cefr_level: string;
  frequency_rank?: number;
  example_sentence?: string;
  status: string;
}

export interface GalaxyEdge {
  source_id: number;
  target_id: number;
  source_word: string;
  target_word: string;
  relation_type: string;
  weight: number;
}

export interface GalaxyStats {
  total_nodes: number;
  undiscovered: number;
  seen: number;
  familiar: number;
  mastered: number;
  progress_pct: number;
}
