import { connectDB } from "@/lib/db/connection";
import { Roadmap, type IRoadmap } from "@/lib/db/models";
import type {
  NormalizedRoadmap,
  TaskAction,
  SkipRiskAssessment,
  TransitionResult,
} from "../types";
import {
  getAllTasks,
  buildContext,
  getTaskOrNull,
  getTaskState,
  validateTransition,
  assessSkipRisk,
  DependencyGraphCache,
  invariant,
} from "../types/shared-logic";
import { needsMigration, migrateV1toV2 } from "./migration";
import { logger } from "@/lib/logger";

// ============================================
// DATABASE SERVICE LAYER (v2)
// ============================================
// Services = orchestration ONLY.
// Logic = shared-logic ONLY.
//
// Rules:
//   - NEVER reimplement logic (no `if task.completed`)
//   - DB = storage only (completedTaskIds, skippedTaskIds)
//   - ALWAYS atomic ($addToSet, $pull) — never replace whole progress
//   - ALWAYS return updated doc (for concurrent tab safety)
//   - validateTransition() runs HERE again (authoritative)
//   - Auto-migrate v1 → v2 on read (once, idempotent)
// ============================================

/**
 * Converts a Mongoose lean doc → NormalizedRoadmap (frontend-ready shape).
 * M-07: userId intentionally omitted — internal DB identifier should not leak to client.
 */
function toNormalized(doc: IRoadmap): NormalizedRoadmap {
  return {
    version: doc.version || "v2",
    role: doc.roleTitle,
    roleId: doc.roleId,
    roleTitle: doc.roleTitle,
    isFallback: doc.isFallback ?? false,
    isMigrated: doc.isMigrated ?? false,
    roadmapVersion: doc.roadmapVersion ?? 1,
    topics: doc.topics.map((topic, ti) => ({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      order: topic.order ?? ti,
      isOptional: topic.isOptional ?? false,
      difficulty: topic.difficulty,
      estimatedTime: topic.estimatedTime,
      subtopics: (topic.subtopics ?? []).map((sub, si) => ({
        id: sub.id,
        topicId: sub.topicId,
        title: sub.title,
        type: sub.type ?? "core",
        groupId: sub.groupId,
        order: sub.order ?? si,
        tasks: (sub.tasks ?? []).map((task, tki) => ({
          id: task.id,
          subtopicId: task.subtopicId,
          title: task.title,
          type: task.type,
          estimatedTime: task.estimatedTime,
          isOptional: task.isOptional ?? false,
          isSkippable: task.isSkippable ?? true,
          priorityScore: task.priorityScore ?? 50,
          order: task.order ?? tki,
          dependencies: (task.dependencies ?? []).map((d) => ({
            type: d.type,
            ...(d.taskId ? { taskId: d.taskId } : {}),
            ...(d.groupId ? { groupId: d.groupId } : {}),
          })),
          groupId: task.groupId,
          generatedBy: task.generatedBy ?? "ai",
          ...(task.scheduledDate ? { scheduledDate: task.scheduledDate } : {}),
          ...(task.actualTimeMinutes != null ? { actualTimeMinutes: task.actualTimeMinutes } : {}),
          ...(task.deadline ? { deadline: task.deadline } : {}),
          ...(task.progressPercentage != null ? { progressPercentage: task.progressPercentage } : {}),
        })),
      })),
    })),
    progress: {
      completedTaskIds: doc.progress?.completedTaskIds ?? [],
      skippedTaskIds: doc.progress?.skippedTaskIds ?? [],
    },
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Fetch a roadmap by userId + roleId.
 * Auto-migrates v1 → v2 on read (once, then persists).
 * Returns null if not found.
 */
export async function getRoadmap(
  userId: string,
  roleId: string
): Promise<NormalizedRoadmap | null> {
  await connectDB();

  const doc = await Roadmap.findOne({ userId, roleId }).lean<IRoadmap>();
  if (!doc) {
    logger.info(`No roadmap found in DB for user=${userId}, role=${roleId}`);
    return null;
  }

  // Auto-migrate v1 → v2 (idempotent: checked via version field)
  if (needsMigration(doc)) {
    logger.info("roadmap_migrated", {
      userId,
      roleId,
      fromVersion: doc.version ?? "v1",
      toVersion: "v2",
    });
    const migrated = migrateV1toV2(doc);

    // Persist migration back to DB (atomic, once)
    await Roadmap.findOneAndUpdate(
      { userId, roleId },
      {
        $set: {
          version: "v2",
          isMigrated: true,
          topics: migrated.topics,
          progress: migrated.progress,
          roadmapVersion: 1,
        },
      }
    );

    logger.info("v1→v2 migration persisted", { userId, roleId });
    return migrated;
  }

  logger.info(`Roadmap fetched from DB for user=${userId}, role=${roleId}`);
  return toNormalized(doc);
}

/**
 * Create a roadmap in DB. Idempotent via upsert:
 * if (userId + roleId) already exists → returns existing document.
 * if not exists → creates atomically.
 */
export async function createRoadmap(
  userId: string,
  data: NormalizedRoadmap
): Promise<NormalizedRoadmap> {
  await connectDB();

  const doc = await Roadmap.findOneAndUpdate(
    { userId, roleId: data.roleId },
    {
      $setOnInsert: {
        userId,
        roleId: data.roleId,
        roleTitle: data.roleTitle || data.role,
        version: data.version || "v2",
        isFallback: data.isFallback ?? false,
        isMigrated: data.isMigrated ?? false,
        roadmapVersion: data.roadmapVersion ?? 1,
        topics: data.topics,
        progress: data.progress ?? { completedTaskIds: [], skippedTaskIds: [] },
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  logger.info(`Roadmap upsert executed for user=${userId}, role=${data.roleId}`);
  return toNormalized(doc);
}

// ============================================
// TASK ACTION SERVICES
// ============================================
// Each function: load → build context → idempotency guard → validate → atomic update → return
// Business logic ONLY via shared-logic. Zero logic duplication.

/**
 * Response meta — enriches the API response for UI consumption.
 * skipRisk: provided when action is "skip"
 * transition: the server-side validation result
 */
export interface TaskActionMeta {
  transition: TransitionResult;
  skipRisk?: SkipRiskAssessment;
}

/**
 * Result of a task action attempt.
 * Services always return this shape — never throw on user errors.
 */
export interface TaskActionResult {
  ok: boolean;
  roadmap?: NormalizedRoadmap;
  error?: string;
  statusCode: number;
  meta?: TaskActionMeta;
}

/** Map action → the target state it achieves. Used for idempotency guard. */
const ACTION_TARGET_STATE: Record<TaskAction, "completed" | "skipped" | "available"> = {
  complete: "completed",
  skip: "skipped",
  uncomplete: "available",
  unskip: "available",
};

/**
 * Execute a task action (complete, uncomplete, skip, unskip).
 * Single entry point for all task state transitions.
 *
 * Flow:
 *   1. Load roadmap from DB
 *   2. Build ComputationContext (shared-logic)
 *   3. Idempotency guard — if already in target state, return early
 *   4. validateTransition (shared-logic) — authoritative server-side guard
 *   5. Compute skipRisk if action is "skip"
 *   6. Atomic MongoDB update ($addToSet / $pull) — both in SAME query
 *   7. Return fresh document + meta
 */
export async function executeTaskAction(
  userId: string,
  roleId: string,
  taskId: string,
  action: TaskAction
): Promise<TaskActionResult> {
  await connectDB();

  // 1. Load roadmap
  const doc = await Roadmap.findOne({ userId, roleId }).lean<IRoadmap>();
  if (!doc) {
    return { ok: false, error: "Roadmap not found.", statusCode: 404 };
  }

  const roadmap = toNormalized(doc);

  // 2. Find task + build context
  const allTasks = getAllTasks(roadmap);
  const ctx = buildContext(allTasks, roadmap.progress);
  const task = getTaskOrNull(ctx.taskMap, taskId);

  if (!task) {
    return { ok: false, error: `Task '${taskId}' not found.`, statusCode: 422 };
  }

  // 3. Idempotency guard — no-op if already in target state
  const currentState = getTaskState(task, allTasks, roadmap.progress);
  const targetState = ACTION_TARGET_STATE[action];
  if (currentState === targetState) {
    logger.info("Task action idempotent no-op", { userId, taskId, action, currentState });
    return {
      ok: true,
      roadmap,
      statusCode: 200,
      meta: { transition: { ok: true } },
    };
  }

  // 4. Validate transition (shared-logic — authoritative)
  const transition = validateTransition(task, action, allTasks, roadmap.progress);
  if (!transition.ok) {
    logger.warn("Task transition rejected (server)", {
      userId, roleId, taskId, action,
      reason: transition.reason,
      currentState: transition.currentState,
    });
    return {
      ok: false,
      error: transition.reason,
      statusCode: 409,
      meta: { transition },
    };
  }

  // 5. Compute skipRisk if action is "skip" (UI needs this)
  let skipRisk: SkipRiskAssessment | undefined;
  if (action === "skip") {
    const graphCache = new DependencyGraphCache(allTasks);
    skipRisk = assessSkipRisk(task, allTasks, roadmap.progress, graphCache);
  }

  // 6. Build atomic update (both $addToSet + $pull in SAME query)
  const update = buildAtomicUpdate(taskId, action);

  // 7. Execute atomic update + return fresh doc
  const updated = await Roadmap.findOneAndUpdate(
    { userId, roleId },
    update,
    { returnDocument: "after" }
  );

  if (!updated) {
    return {
      ok: false,
      error: "Task state changed. Please refresh.",
      statusCode: 409,
      meta: { transition: { ok: false, reason: "concurrent_modification", currentState } },
    };
  }

  logger.info(`Task action executed`, { userId, roleId, taskId, action });
  logger.analytics("TASK_ACTION", { userId, roleId, taskId, action });

  return {
    ok: true,
    roadmap: toNormalized(updated),
    statusCode: 200,
    meta: { transition, skipRisk },
  };
}

/**
 * Build the MongoDB atomic update operator for a given action.
 * Uses $addToSet / $pull — NEVER replaces the whole progress object.
 */
function buildAtomicUpdate(taskId: string, action: TaskAction) {
  switch (action) {
    case "complete":
      return {
        $addToSet: { "progress.completedTaskIds": taskId },
        // Defensive: clean stale skipped entry if present
        $pull: { "progress.skippedTaskIds": taskId },
      };
    case "uncomplete":
      return {
        $pull: { "progress.completedTaskIds": taskId },
      };
    case "skip":
      return {
        $addToSet: { "progress.skippedTaskIds": taskId },
        // Defensive: clean stale completed entry if present
        $pull: { "progress.completedTaskIds": taskId },
      };
    case "unskip":
      return {
        $pull: { "progress.skippedTaskIds": taskId },
      };
    default:
      invariant(false, `Unknown task action: ${action}`);
  }
}
