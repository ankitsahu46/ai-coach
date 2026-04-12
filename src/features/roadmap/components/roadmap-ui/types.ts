/**
 * Roadmap UI Module — ViewModel Type Definitions
 *
 * CONTRACT:
 * - These types define what the UI renders. They are ViewModels, NOT DB shapes.
 * - The main project's `roadmapSelectors` transform NormalizedRoadmap → these ViewModels.
 * - UI never touches raw DB data. No exceptions.
 * - All arrays default to []. All nullable objects default to null.
 * - All lists are pre-sorted by `order` — UI never calls .sort().
 * - All IDs are stable UUIDs — never index-based, never regenerated.
 *
 * In the main project, move this file to: shared/types/roadmap.ts
 */

// ─── Enums ────────────────────────────────────────────────────────────

export type TaskType = "learn" | "practice" | "project";
export type TaskState = "locked" | "available" | "completed" | "skipped";

// ─── Resource ─────────────────────────────────────────────────────────

export interface TaskResource {
  title: string;
  url: string;
  type: "docs" | "video" | "article" | "exercise";
}

// ─── ViewModels (produced by selectors, consumed by UI) ───────────────

export interface TaskView {
  id: string;                    // Stable UUID — NEVER index-based
  title: string;
  type: TaskType;
  state: TaskState;
  estimatedTime: string;
  isRecommended: boolean;
  dependencyHint?: string;       // e.g. "Complete Async/Await to unlock"
  isLoading?: boolean;           // true while optimistic update is in flight
  order: number;                 // Stable sort position (set by selector)
}

export interface TaskDetailView extends TaskView {
  description: string;
  resources: TaskResource[];     // default: []
  skills: string[];              // default: []
  prerequisites: { id: string; title: string; met: boolean }[];  // default: []
  unlocks: string[];             // downstream task titles, default: []
  isBookmarked: boolean;
}

export interface FocusTaskView {
  id: string;
  title: string;
  type: TaskType;
  estimatedTime: string;
  description: string;
  skills: string[];              // default: []
  unlocks: string[];             // "Why this matters" downstream titles, default: []
  isRecommended: boolean;
  resources: TaskResource[];     // default: []
  nextTask: { id: string; title: string } | null;  // null = no next task
}

export interface SubtopicView {
  id: string;
  title: string;
  progress: number;              // 0-100, computed by selector
  completedCount: number;
  totalCount: number;
  hasAvailableTasks: boolean;
  tasks: TaskView[];             // default: [], pre-sorted by `order`
  order: number;                 // Stable sort position
}

export interface TopicView {
  id: string;
  title: string;
  difficulty: string;
  progress: number;              // 0-100, computed by selector
  totalTasks: number;
  completedTasks: number;
  availableTasks: number;
  narrative: string;             // e.g. "Almost there — 4 tasks left 🏁"
  isActive: boolean;
  isLocked: boolean;
  subtopics: SubtopicView[];     // default: [], pre-sorted by `order`
  order: number;                 // Stable sort position
}

export interface ProgressStats {
  percentage: number;            // 0-100
  completed: number;
  total: number;
  available: number;
  remainingHours: number;
}

export interface StreakView {
  days: number;
  todayCompleted: number;
  todayGoal: number;
}

export interface MomentumView {
  message: string;               // "⚡ Great momentum — 2 tasks done today!"
  emoji: string;
  taskCount: number;
}

export interface DailyPlanTaskView {
  id: string;
  title: string;
  type: TaskType;
  estimatedTime: string;
  difficulty: "Easy" | "Medium" | "Stretch";
  order: number;                 // Stable sort position
}

export interface DailyPlanView {
  tasks: DailyPlanTaskView[];    // default: [], pre-sorted by `order`
  reasoning: string;             // AI explanation
  totalTime: string;
}

export interface WeeklySummaryView {
  tasksCompleted: number;
  vsLastWeek: number;            // +/- diff
  unlockedSkills: string[];      // default: []
}

// ─── Feature Flags (future-proof) ─────────────────────────────────────

export interface RoadmapFeatureFlags {
  focusMode?: boolean;           // default: true
  weeklySummary?: boolean;       // default: true
  dailyPlan?: boolean;           // default: true
  momentumBanner?: boolean;      // default: true
  streakWidget?: boolean;        // default: true
  continueBar?: boolean;         // default: true
}

// ─── Action Contract (UI → main project orchestrator) ────────────────

export type RoadmapAction =
  | { type: "complete"; taskId: string }
  | { type: "uncomplete"; taskId: string }
  | { type: "skip"; taskId: string }
  | { type: "unskip"; taskId: string }
  | { type: "bookmark"; taskId: string }
  | { type: "open"; taskId: string }
  | { type: "close-panel" }
  | { type: "focus"; taskId: string }
  | { type: "exit-focus" }
  | { type: "focus-next" }
  | { type: "resume" }
  | { type: "scroll-to-recommended" };

export interface ActionResult {
  success: boolean;
  error?: string;                // UI shows toast / retry on error
}

export type OnAction = (action: RoadmapAction) => Promise<ActionResult>;

// ─── Page Props (Composition Root Contract) ──────────────────────────

export interface RoadmapPageProps {
  // Dynamic title from roadmap data
  title: string;

  // ViewModels (from roadmapSelectors — all null-safe)
  topics: TopicView[];                    // default: []
  progress: ProgressStats;
  dailyPlan: DailyPlanView | null;
  momentum: MomentumView | null;          // null = don't show
  weeklySummary: WeeklySummaryView | null;
  streak: StreakView | null;
  lastTask: { id: string; title: string; type: TaskType } | null;  // null = no continue bar
  selectedTask: TaskDetailView | null;    // null = panel closed
  focusTask: FocusTaskView | null;        // null = focus mode off
  recommendedTaskId: string | null;

  // Loading state (optimistic updates)
  isUpdatingTaskIds: Set<string>;

  // Feature flags (progressive rollout)
  features?: RoadmapFeatureFlags;

  // Celebration state
  showConfetti: boolean;
  toast: { message: string; visible: boolean; variant: "success" | "info" | "skill" } | null;

  // Actions — single entry point
  onAction: OnAction;
}
