import mongoose, { Schema, Document, Model } from "mongoose";

// ============================================
// ROADMAP MODEL (v2)
// ============================================
// Source of truth for user roadmaps.
// Hierarchy: Topic → Subtopic → Task (embedded)
// Progress: flat arrays { completedTaskIds, skippedTaskIds }
//
// ⚠️ RULES:
//   - NO computed fields (state, unlocked, percentage)
//   - NO business logic — that's shared-logic.ts
//   - Schema = STORAGE ONLY
// ============================================

// --- Subdocument: Task ---
export interface ITask {
  id: string;
  subtopicId: string;
  title: string;
  type: "learn" | "practice" | "project";
  estimatedTime: string;
  isOptional: boolean;
  isSkippable: boolean;
  priorityScore: number;
  order: number;
  dependencies: {
    type: "hard" | "soft";
    taskId?: string;
    groupId?: string;
  }[];
  groupId?: string;
  generatedBy: "ai" | "system" | "user";
  // Future-ready (optional)
  scheduledDate?: string;
  actualTimeMinutes?: number;
  deadline?: string;
  progressPercentage?: number;
}

// --- Subdocument: Subtopic ---
export interface ISubtopic {
  id: string;
  topicId: string;
  title: string;
  type: "core" | "optional" | "alternative";
  groupId?: string;
  tasks: ITask[];
  order: number;
}

// --- Subdocument: Topic ---
export interface ITopic {
  id: string;
  title: string;
  description: string;
  order: number;
  isOptional: boolean;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedTime: string;
  subtopics: ISubtopic[];
}

// --- Subdocument: Progress ---
export interface IProgress {
  completedTaskIds: string[];
  skippedTaskIds: string[];
  // Future-ready
  taskSchedule?: Record<string, string>;
  taskActualTime?: Record<string, number>;
  velocity?: number;
  estimatedCompletionDate?: string;
}

// --- Root Document ---
export interface IRoadmap extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  roleId: string;
  roleTitle: string;
  version: "v1" | "v2";
  isFallback: boolean;
  isMigrated: boolean;
  roadmapVersion: number;
  topics: ITopic[];
  progress: IProgress;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// SCHEMAS (embedded, _id: false)
// ============================================

const TaskDependencySchema = new Schema(
  {
    type: { type: String, required: true, enum: ["hard", "soft"] },
    taskId: { type: String, required: false },
    groupId: { type: String, required: false },
  },
  { _id: false }
);

const TaskSchema = new Schema<ITask>(
  {
    id: { type: String, required: true },
    subtopicId: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, required: true, enum: ["learn", "practice", "project"] },
    estimatedTime: { type: String, required: true },
    isOptional: { type: Boolean, default: false },
    isSkippable: { type: Boolean, default: true },
    priorityScore: { type: Number, default: 50, min: 0, max: 100 },
    order: { type: Number, required: true },
    dependencies: { type: [TaskDependencySchema], default: [] },
    groupId: { type: String, required: false },
    generatedBy: { type: String, default: "ai", enum: ["ai", "system", "user"] },
    // Future-ready
    scheduledDate: { type: String, required: false },
    actualTimeMinutes: { type: Number, required: false },
    deadline: { type: String, required: false },
    progressPercentage: { type: Number, required: false },
  },
  { _id: false }
);

const SubtopicSchema = new Schema<ISubtopic>(
  {
    id: { type: String, required: true },
    topicId: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, default: "core", enum: ["core", "optional", "alternative"] },
    groupId: { type: String, required: false },
    tasks: { type: [TaskSchema], default: [] },
    order: { type: Number, required: true },
  },
  { _id: false }
);

const TopicSchema = new Schema<ITopic>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    order: { type: Number, required: true },
    isOptional: { type: Boolean, default: false },
    difficulty: {
      type: String,
      required: true,
      enum: ["Beginner", "Intermediate", "Advanced"],
    },
    estimatedTime: { type: String, required: true },
    subtopics: { type: [SubtopicSchema], default: [] },
  },
  { _id: false }
);

const ProgressSchema = new Schema<IProgress>(
  {
    completedTaskIds: { type: [String], default: [] },
    skippedTaskIds: { type: [String], default: [] },
    // Future-ready
    taskSchedule: { type: Map, of: String, required: false },
    taskActualTime: { type: Map, of: Number, required: false },
    velocity: { type: Number, required: false },
    estimatedCompletionDate: { type: String, required: false },
  },
  { _id: false }
);

// ============================================
// ROOT SCHEMA
// ============================================

const RoadmapSchema = new Schema<IRoadmap>(
  {
    userId: { type: String, required: true, index: true },
    roleId: { type: String, required: true },
    roleTitle: { type: String, required: true },
    version: { type: String, default: "v2", enum: ["v1", "v2"] },
    isFallback: { type: Boolean, default: false },
    isMigrated: { type: Boolean, default: false },
    roadmapVersion: { type: Number, default: 1 },
    topics: { type: [TopicSchema], default: [] },
    progress: { type: ProgressSchema, default: { completedTaskIds: [], skippedTaskIds: [] } },
  },
  {
    timestamps: true, // Auto-manages createdAt + updatedAt
  }
);

// Compound unique index: one roadmap per user + role (idempotency guarantee)
RoadmapSchema.index({ userId: 1, roleId: 1 }, { unique: true });

// Prevent model recompilation in dev (HMR)
export const Roadmap: Model<IRoadmap> =
  mongoose.models.Roadmap || mongoose.model<IRoadmap>("Roadmap", RoadmapSchema);
