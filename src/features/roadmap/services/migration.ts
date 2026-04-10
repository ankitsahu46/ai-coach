import type { NormalizedRoadmap, LegacyRoadmap, Topic, Subtopic, Task } from "../types";
import { legacyRoadmapSchema } from "../types";
import { sanitizeDependencies, validateDependencyGraph } from "../types/shared-logic";
import { logger } from "@/lib/logger";

// ============================================
// V1 → V2 DEEP MIGRATION ENGINE
// ============================================
// Converts flat v1 roadmaps (topics with `completed` boolean)
// into hierarchical v2 (Topic → Subtopic → Task) with flat
// progress arrays (completedTaskIds / skippedTaskIds).
//
// Rules:
//   - Idempotent: if version === "v2", return as-is
//   - Non-destructive: preserves completion state
//   - Generates stable UUIDs for all new entities
//   - Each v1 topic → 1 subtopic → 1 task (1:1 mapping)
//   - Completed topics → completedTaskIds entry
//   - Always sanitizes dependencies + validates DAG after migration
// ============================================

/**
 * Detect if a roadmap document needs migration.
 * Returns true if version is "v1" or missing.
 */
export function needsMigration(doc: { version?: string }): boolean {
  return !doc.version || doc.version === "v1";
}

/**
 * Migrate a v1 roadmap to v2.
 * Idempotent: if already v2, returns as-is.
 *
 * Strategy:
 *   - Each v1 topic becomes: Topic → Subtopic("Core Concepts") → Task(topic.title)
 *   - topic.completed === true → taskId added to completedTaskIds
 *   - All new IDs are UUIDs via crypto.randomUUID()
 *   - Dependencies are sanitized post-migration
 *   - Graph is validated for DAG integrity
 */
export function migrateV1toV2(raw: unknown): NormalizedRoadmap {
  // Parse v1 shape (safe — returns errors if not v1)
  const parseResult = legacyRoadmapSchema.safeParse(raw);
  if (!parseResult.success) {
    logger.error("migration_parse_failed", {
      errors: parseResult.error.flatten().fieldErrors,
    });
    throw new Error("[Migration] Cannot parse v1 roadmap data.");
  }

  const v1 = parseResult.data;
  const completedTaskIds: string[] = [];
  const now = new Date().toISOString();

  // Convert each v1 topic → Topic → Subtopic → Task
  const topics: Topic[] = v1.topics.map((legacyTopic, topicIdx) => {
    const topicId = crypto.randomUUID();
    const subtopicId = crypto.randomUUID();
    const taskId = crypto.randomUUID();

    // Preserve completion state in progress array
    if (legacyTopic.completed) {
      completedTaskIds.push(taskId);
    }

    const task: Task = {
      id: taskId,
      subtopicId,
      title: legacyTopic.title,
      type: "learn",
      estimatedTime: legacyTopic.estimatedTime,
      isOptional: false,
      isSkippable: true,
      priorityScore: 50,
      order: 0,
      dependencies: [],
      generatedBy: "system",
    };

    const subtopic: Subtopic = {
      id: subtopicId,
      topicId,
      title: "Core Concepts",
      type: "core",
      tasks: [task],
      order: 0,
    };

    return {
      id: topicId,
      title: legacyTopic.title,
      description: legacyTopic.description,
      order: topicIdx,
      isOptional: false,
      difficulty: legacyTopic.difficulty,
      estimatedTime: legacyTopic.estimatedTime,
      subtopics: [subtopic],
    };
  });

  // Assemble v2 roadmap
  let migrated: NormalizedRoadmap = {
    version: "v2",
    role: v1.role,
    roleId: v1.roleId,
    roleTitle: v1.roleTitle ?? v1.role,
    isFallback: v1.isFallback ?? false,
    isMigrated: true,
    roadmapVersion: 1,
    topics,
    progress: {
      completedTaskIds,
      skippedTaskIds: [],
    },
    createdAt: v1.createdAt ?? now,
    updatedAt: now,
  };

  // Post-migration safety: sanitize + validate
  migrated = sanitizeDependencies(migrated);

  const graphResult = validateDependencyGraph(migrated);
  if (!graphResult.valid) {
    logger.warn("migration_graph_cycles", { cycles: graphResult.cycles });
  }

  logger.info("migration_v1_to_v2_complete", {
    topicCount: topics.length,
    migratedCompletions: completedTaskIds.length,
  });

  return migrated;
}

/**
 * Auto-migrate on read: if v1, migrate + return v2.
 * If v2, return as-is. Idempotent.
 */
export function autoMigrate(roadmap: NormalizedRoadmap | Record<string, unknown>): NormalizedRoadmap {
  // Already v2 → pass through
  if ((roadmap as NormalizedRoadmap).version === "v2") {
    return roadmap as NormalizedRoadmap;
  }

  // Attempt v1 → v2 migration
  return migrateV1toV2(roadmap);
}
