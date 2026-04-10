import { z } from "zod";

// ============================================
// AI CAREER COACH — ROADMAP TYPE SYSTEM (v2)
// ============================================
// Single source of truth. All types derived from Zod schemas.
// Hierarchy: Topic → Subtopic → Task
// Progress: flat arrays (completedTaskIds, skippedTaskIds)
// State: always DERIVED, never stored.
// ============================================

// ============================================
// ENUMS & PRIMITIVES
// ============================================

export const topicDifficultySchema = z.enum(["Beginner", "Intermediate", "Advanced"]);
export type Difficulty = z.infer<typeof topicDifficultySchema>;

export const taskTypeSchema = z.enum(["learn", "practice", "project"]);
export type TaskType = z.infer<typeof taskTypeSchema>;

export const subtopicTypeSchema = z.enum(["core", "optional", "alternative"]);
export type SubtopicType = z.infer<typeof subtopicTypeSchema>;

export const dependencyTypeSchema = z.enum(["hard", "soft"]);
export type DependencyType = z.infer<typeof dependencyTypeSchema>;

export const taskStateSchema = z.enum(["completed", "skipped", "locked", "available"]);
export type TaskState = z.infer<typeof taskStateSchema>;

export const taskActionSchema = z.enum(["complete", "uncomplete", "skip", "unskip"]);
export type TaskAction = z.infer<typeof taskActionSchema>;

export const skipRiskLevelSchema = z.enum(["low", "medium", "high"]);
export type SkipRiskLevel = z.infer<typeof skipRiskLevelSchema>;

export const taskOriginSchema = z.enum(["ai", "system", "user"]);
export type TaskOrigin = z.infer<typeof taskOriginSchema>;

// ============================================
// DEPENDENCY SCHEMA
// ============================================
// Exactly ONE of taskId or groupId must be set.
// - taskId: direct dependency on a specific task
// - groupId: group dependency (any member satisfies)

export const taskDependencySchema = z
  .object({
    type: dependencyTypeSchema,
    taskId: z.string().optional(),
    groupId: z.string().optional(),
  })
  .refine((d) => (d.taskId != null) !== (d.groupId != null), {
    message: "Exactly one of taskId or groupId must be set per dependency.",
  });

export type TaskDependency = z.infer<typeof taskDependencySchema>;

// ============================================
// DEBUG METADATA
// ============================================
// Structured, not generic. Each field maps to a
// specific subsystem for debugging, analytics,
// and future AI explanation features.

export const debugMetaSchema = z.object({
  /** Why this task is available / what unlocked it */
  unlockReason: z.string().optional(),
  /** Why this task is locked / what's blocking it */
  lockReason: z.string().optional(),
  /** Why the recommendation engine chose this task */
  recommendationReason: z.string().optional(),
  /** Why the skip risk was assessed at its level */
  riskReason: z.string().optional(),
});

export type DebugMeta = z.infer<typeof debugMetaSchema>;

// ============================================
// TASK SCHEMA
// ============================================

export const taskSchema = z.object({
  id: z.string(),
  subtopicId: z.string(),
  title: z.string(),
  type: taskTypeSchema,
  estimatedTime: z.string(),
  isOptional: z.boolean().default(false),
  isSkippable: z.boolean().default(true),
  priorityScore: z.number().min(0).max(100).default(50),
  order: z.number(),

  // Dependency system
  dependencies: z.array(taskDependencySchema).default([]),

  // Alternative paths — tasks sharing groupId are alternatives
  groupId: z.string().optional(),

  // Provenance tracking
  generatedBy: taskOriginSchema.default("ai"),

  // Future-ready: time-based scheduling (all optional, no logic yet)
  scheduledDate: z.string().optional(),
  actualTimeMinutes: z.number().optional(),
  deadline: z.string().optional(),

  // Future-ready: partial progress (no logic yet)
  progressPercentage: z.number().min(0).max(100).optional(),
});

export type Task = z.infer<typeof taskSchema>;

// ============================================
// SUBTOPIC SCHEMA
// ============================================

export const subtopicSchema = z.object({
  id: z.string(),
  topicId: z.string(),
  title: z.string(),
  type: subtopicTypeSchema.default("core"),
  groupId: z.string().optional(),
  tasks: z.array(taskSchema).default([]),
  order: z.number(),
});

export type Subtopic = z.infer<typeof subtopicSchema>;

// ============================================
// TOPIC SCHEMA
// ============================================

export const topicSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  order: z.number(),
  isOptional: z.boolean().default(false),
  difficulty: topicDifficultySchema,
  estimatedTime: z.string(),
  subtopics: z.array(subtopicSchema).default([]),
});

export type Topic = z.infer<typeof topicSchema>;

// ============================================
// USER PROGRESS SCHEMA
// ============================================
// Flat arrays for O(1) lookups + atomic MongoDB operations.
// Task state is DERIVED from these arrays — never stored.

export const userProgressSchema = z.object({
  completedTaskIds: z.array(z.string()).default([]),
  skippedTaskIds: z.array(z.string()).default([]),

  // Future-ready: time scheduling (no logic yet)
  taskSchedule: z.record(z.string(), z.string()).optional(),
  taskActualTime: z.record(z.string(), z.number()).optional(),
  velocity: z.number().optional(),
  estimatedCompletionDate: z.string().optional(),
});

export type UserProgress = z.infer<typeof userProgressSchema>;

// ============================================
// NORMALIZED ROADMAP SCHEMA (v2)
// ============================================

export const normalizedRoadmapSchema = z.object({
  version: z.enum(["v1", "v2"]).default("v2"),
  role: z.string(),
  roleId: z.string(),
  roleTitle: z.string().optional(),
  userId: z.string().optional(),
  isFallback: z.boolean().default(false),
  isMigrated: z.boolean().default(false),
  roadmapVersion: z.number().default(1),
  topics: z.array(topicSchema),
  progress: userProgressSchema.default({ completedTaskIds: [], skippedTaskIds: [] }),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type NormalizedRoadmap = z.infer<typeof normalizedRoadmapSchema>;

// ============================================
// STATE TRANSITION TYPES
// ============================================

export interface TransitionResult {
  ok: boolean;
  reason?: string;
  currentState?: TaskState;
  attemptedAction?: TaskAction;
}

// ============================================
// SKIP RISK ASSESSMENT TYPES
// ============================================

export interface SkipRiskAssessment {
  risk: SkipRiskLevel;
  affectedTaskCount: number;
  affectedTaskTitles: string[];
  criticalPathImpact: boolean;
  remediationHint: string;
}

// ============================================
// ACTIVE WINDOW TYPES
// ============================================

export interface ActiveWindowResult {
  tasks: Task[];
  totalAvailable: number;
  recommended: Task | null;
  hasMore: boolean;
  fallback: NoTasksFallback | null;
}

export interface NoTasksFallback {
  tier: 1 | 2 | 3;
  reason: string;
  suggestions: FallbackSuggestion[];
}

export interface FallbackSuggestion {
  type: "unskip" | "complete_alternative" | "reset_progress" | "show_optional";
  taskId?: string;
  taskTitle?: string;
  description: string;
}

// ============================================
// PROGRESS STATS (derived, never stored)
// ============================================

export interface ProgressStats {
  total: number;
  completed: number;
  skipped: number;
  available: number;
  locked: number;
  percentage: number;
}

export interface TopicProgressStats {
  total: number;
  completed: number;
  percentage: number;
}

// ============================================
// GRAPH VALIDATION TYPES
// ============================================

export interface GraphValidationResult {
  valid: boolean;
  cycles: string[][];
}

export interface ReferenceValidationResult {
  valid: boolean;
  danglingRefs: string[];
}

export interface GroupValidationResult {
  valid: boolean;
  invalidGroups: string[];
}

// ============================================
// API REQUEST/RESPONSE SCHEMAS
// ============================================

/**
 * POST /api/roadmap — request body validation
 * Secured via NextAuth session (userId extracted server-side)
 */
export const postRoadmapRequestSchema = z.object({
  roleTitle: z.string().min(1, "roleTitle is required").max(200, "roleTitle too long"),
  roleDescription: z.string().max(2000, "roleDescription too long").optional(),
  roleId: z.string().min(1, "roleId is required").max(100, "roleId too long"),
  importedRoadmap: normalizedRoadmapSchema.optional(),
});

export type PostRoadmapRequest = z.infer<typeof postRoadmapRequestSchema>;

/**
 * PATCH /api/roadmap — request body validation
 * Action-based: complete, uncomplete, skip, unskip
 */
export const patchTaskRequestSchema = z.object({
  roleId: z.string().min(1, "roleId is required"),
  taskId: z.string().min(1, "taskId is required"),
  action: taskActionSchema,
});

export type PatchTaskRequest = z.infer<typeof patchTaskRequestSchema>;

// ============================================
// AI RESPONSE CONTRACT (for AI generation)
// ============================================

export const aiTaskOutputSchema = z.object({
  title: z.string(),
  type: taskTypeSchema,
  estimatedTime: z.string(),
  isOptional: z.boolean().optional().default(false),
  isSkippable: z.boolean().optional().default(true),
  priorityScore: z.number().min(0).max(100).optional(),
  dependencyRefs: z.array(z.string()).optional().default([]),
  dependencyType: dependencyTypeSchema.optional().default("soft"),
  groupId: z.string().optional(),
});

export type AITaskOutput = z.infer<typeof aiTaskOutputSchema>;

export const aiSubtopicOutputSchema = z.object({
  title: z.string(),
  type: subtopicTypeSchema.optional().default("core"),
  groupId: z.string().optional(),
  tasks: z.array(aiTaskOutputSchema),
});

export type AISubtopicOutput = z.infer<typeof aiSubtopicOutputSchema>;

export const aiTopicOutputSchema = z.object({
  title: z.string(),
  description: z.string(),
  difficulty: topicDifficultySchema,
  estimatedTime: z.string(),
  isOptional: z.boolean().optional().default(false),
  subtopics: z.array(aiSubtopicOutputSchema),
});

export type AITopicOutput = z.infer<typeof aiTopicOutputSchema>;

export const roadmapResponseSchema = z.object({
  role: z.string(),
  topics: z.array(aiTopicOutputSchema),
});

export type RoadmapResponseOutput = z.infer<typeof roadmapResponseSchema>;

/** Input type — before Zod defaults are applied. Use for raw data constructors (fallback, normalizer). */
export type RoadmapResponseInput = z.input<typeof roadmapResponseSchema>;

// ============================================
// LEGACY SCHEMAS (v1 — for migration)
// ============================================
// Preserved to parse old roadmaps during v1→v2 migration.

export const legacyTopicSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  difficulty: topicDifficultySchema,
  estimatedTime: z.string(),
  completed: z.boolean(),
});

export type LegacyTopic = z.infer<typeof legacyTopicSchema>;

export const legacyRoadmapSchema = z.object({
  version: z.literal("v1").optional(),
  role: z.string(),
  roleId: z.string(),
  roleTitle: z.string().optional(),
  userId: z.string().optional(),
  isFallback: z.boolean().optional(),
  topics: z.array(legacyTopicSchema),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type LegacyRoadmap = z.infer<typeof legacyRoadmapSchema>;
