import { useMemo } from "react";
import type {
  NormalizedRoadmap,
  Task,
  TaskState,
  ProgressStats,
  TopicProgressStats,
  Topic,
} from "../types";
import {
  getAllTasks,
  buildContext,
  DependencyGraphCache,
  getProgress,
  getTopicProgress,
  getNextRecommendedTask,
} from "../types/shared-logic";

// ============================================
// ROADMAP SELECTORS — Derived State Layer
// ============================================
// Memoized hooks that bridge shared-logic → UI.
// All business logic runs through shared-logic.
// UI components NEVER import shared-logic directly.
//
// Performance guarantees:
//   - useGraphCache: recomputed only when roadmap structure changes
//   - useAllTaskStates: single-pass computation, memoized on progress
//   - All downstream selectors derive from useAllTaskStates (no duplicate work)
// ============================================

/**
 * Memoized DependencyGraphCache.
 * Recomputed ONLY when roadmap topic structure changes (not on progress changes).
 * Returns null if no roadmap data.
 */
export function useGraphCache(
  roadmap: NormalizedRoadmap | null
): DependencyGraphCache | null {
  return useMemo(() => {
    if (!roadmap) return null;
    const allTasks = getAllTasks(roadmap);
    if (allTasks.length === 0) return null;
    return new DependencyGraphCache(allTasks);
    // Memoize on topics reference — progress changes don't invalidate the graph
  }, [roadmap?.topics]);
}

/**
 * Single-pass computation of ALL task states.
 * Returns a Map<taskId, TaskState> for O(1) lookups.
 * This is the shared base — all other selectors derive from it.
 */
export function useAllTaskStates(
  roadmap: NormalizedRoadmap | null
): Map<string, TaskState> {
  return useMemo(() => {
    if (!roadmap) return new Map();

    const allTasks = getAllTasks(roadmap);
    if (allTasks.length === 0) return new Map();

    const ctx = buildContext(allTasks, roadmap.progress);
    const stateMap = new Map<string, TaskState>();

    for (const task of allTasks) {
      if (ctx.completedSet.has(task.id)) {
        stateMap.set(task.id, "completed");
      } else if (ctx.skippedSet.has(task.id)) {
        stateMap.set(task.id, "skipped");
      } else {
        // Check dependencies
        let unlocked = true;
        for (const dep of task.dependencies) {
          // Inline dependency check using ctx for O(1)
          if (dep.taskId) {
            if (dep.type === "hard") {
              if (!ctx.completedSet.has(dep.taskId)) { unlocked = false; break; }
            } else {
              if (!ctx.completedSet.has(dep.taskId) && !ctx.skippedSet.has(dep.taskId)) { unlocked = false; break; }
            }
          } else if (dep.groupId) {
            let groupSatisfied = false;
            for (const [, member] of ctx.taskMap) {
              if (member.groupId !== dep.groupId) continue;
              if (dep.type === "hard") {
                if (ctx.completedSet.has(member.id)) { groupSatisfied = true; break; }
              } else {
                if (ctx.completedSet.has(member.id) || ctx.skippedSet.has(member.id)) { groupSatisfied = true; break; }
              }
            }
            if (!groupSatisfied) { unlocked = false; break; }
          }
        }
        stateMap.set(task.id, unlocked ? "available" : "locked");
      }
    }

    return stateMap;
  }, [roadmap?.topics, roadmap?.progress]);
}

/**
 * Look up a single task's state. O(1) via the pre-computed map.
 */
export function useTaskState(
  taskStates: Map<string, TaskState>,
  taskId: string
): TaskState {
  return taskStates.get(taskId) ?? "locked";
}

/**
 * Overall progress stats derived from the task state map.
 * Uses shared-logic's getProgress for canonical computation.
 */
export function useRoadmapStats(
  roadmap: NormalizedRoadmap | null
): ProgressStats {
  return useMemo(() => {
    return getProgress(roadmap, roadmap?.progress);
  }, [roadmap?.topics, roadmap?.progress]);
}

/**
 * Progress stats for a single topic.
 */
export function useTopicProgressStats(
  topic: Topic,
  roadmap: NormalizedRoadmap | null
): TopicProgressStats {
  return useMemo(() => {
    return getTopicProgress(topic, roadmap?.progress);
  }, [topic, roadmap?.progress]);
}

/**
 * Next recommended task via shared-logic's scoring algorithm.
 * Depends on graphCache for transitive dependency analysis.
 */
export function useNextTask(
  roadmap: NormalizedRoadmap | null,
  graphCache: DependencyGraphCache | null
): Task | null {
  return useMemo(() => {
    return getNextRecommendedTask(roadmap, roadmap?.progress, graphCache);
  }, [roadmap?.topics, roadmap?.progress, graphCache]);
}
