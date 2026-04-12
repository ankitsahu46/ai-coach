import { create } from "zustand";
import type { NormalizedRoadmap, TaskAction, UserProgress } from "../types";
import type { NormalizedConsistency } from "../../consistency/types";
import { logger } from "../utils/logger";

// ============================================
// ROADMAP ZUSTAND STORE — Pure State Container
// ============================================
// This store is the ONLY place roadmap data lives on the client.
// Both the Roadmap page and Dashboard read from here.
//
// Architecture constraints:
//   - NO business logic
//   - NO validation
//   - NO auth awareness
//   - NO async operations
//   - State mutations are minimal and reference-stable
//
// Flow:
//   UI → Hook (validate + orchestrate) → Store (pure state)
//   Selectors (shared-logic) → UI render
// ============================================

const CACHE_PREFIX = "roadmap";

/** Scoped localStorage key based on userId */
function cacheKey(roleId: string, uid?: string): string {
  const scope = uid ? `user_${uid}` : "guest";
  return `${CACHE_PREFIX}:${scope}:${roleId}`;
}

/** Read from localStorage with 7-day staleness check */
export function getCachedRoadmap(roleId: string, uid?: string): NormalizedRoadmap | null {
  try {
    const stored = localStorage.getItem(cacheKey(roleId, uid));
    if (!stored) return null;
    const parsed: NormalizedRoadmap = JSON.parse(stored);
    const ageMs = Date.now() - new Date(parsed.createdAt).getTime();
    if (ageMs > 7 * 24 * 60 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Write to localStorage */
export function setCachedRoadmap(roleId: string, data: NormalizedRoadmap, uid?: string) {
  try {
    localStorage.setItem(cacheKey(roleId, uid), JSON.stringify(data));
  } catch {
    logger.warn("localStorage quota exceeded; unable to cache roadmap.");
  }
}

// ============================================
// STORE INTERFACE
// ============================================

interface RoadmapState {
  /** The roadmap data — THE single source of truth */
  roadmapData: NormalizedRoadmap | null;

  /** The consistency data — THE single source of truth */
  consistencyData: NormalizedConsistency | null;

  /** UI loading flags */
  isLoading: boolean;
  isDelayedUX: boolean;
  error: string | null;

  /** Simple setters */
  setRoadmapData: (data: NormalizedRoadmap | null) => void;
  setConsistencyData: (data: NormalizedConsistency | null) => void;
  setLoading: (v: boolean) => void;
  setDelayedUX: (v: boolean) => void;
  setError: (v: string | null) => void;

  /** UI Layout States */
  selectedTaskId: string | null;
  focusTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  setFocusTaskId: (id: string | null) => void;

  /**
   * Optimistic update: mutate progress arrays based on action.
   * Minimal reference change — only creates new array if state actually changes.
   * NO validation. Hook must validate BEFORE calling this.
   */
  performOptimisticUpdate: (taskId: string, action: TaskAction) => void;

  /**
   * Rollback: restore an exact previous progress snapshot.
   * Guarantees correctness for any skip/complete combo.
   */
  rollbackProgress: (prevProgress: UserProgress) => void;
}

export const useRoadmapStore = create<RoadmapState>((set, get) => ({
  // ── Initial State ──
  roadmapData: null,
  consistencyData: null,
  isLoading: false,
  isDelayedUX: false,
  error: null,
  selectedTaskId: null,
  focusTaskId: null,

  // ── Setters ──
  setRoadmapData: (data) => set({ roadmapData: data }),
  setConsistencyData: (data) => set({ consistencyData: data }),
  setLoading: (v) => set({ isLoading: v }),
  setDelayedUX: (v) => set({ isDelayedUX: v }),
  setError: (v) => set({ error: v }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  setFocusTaskId: (id) => set({ focusTaskId: id }),

  // ── Optimistic Update ──
  performOptimisticUpdate: (taskId, action) => {
    const current = get().roadmapData;
    if (!current) return;

    const { completedTaskIds, skippedTaskIds } = current.progress;

    let newCompleted = completedTaskIds;
    let newSkipped = skippedTaskIds;

    switch (action) {
      case "complete": {
        // Only mutate if not already present (reference stability)
        if (!completedTaskIds.includes(taskId)) {
          newCompleted = [...completedTaskIds, taskId];
        }
        break;
      }
      case "uncomplete": {
        if (completedTaskIds.includes(taskId)) {
          newCompleted = completedTaskIds.filter((id) => id !== taskId);
        }
        break;
      }
      case "skip": {
        if (!skippedTaskIds.includes(taskId)) {
          newSkipped = [...skippedTaskIds, taskId];
        }
        break;
      }
      case "unskip": {
        if (skippedTaskIds.includes(taskId)) {
          newSkipped = skippedTaskIds.filter((id) => id !== taskId);
        }
        break;
      }
    }

    // Only update if references actually changed (prevents cascade re-renders)
    if (newCompleted === completedTaskIds && newSkipped === skippedTaskIds) {
      return;
    }

    set({
      roadmapData: {
        ...current,
        progress: {
          ...current.progress,
          completedTaskIds: newCompleted,
          skippedTaskIds: newSkipped,
        },
      },
    });

    logger.info("Optimistic update applied", { taskId, action });
  },

  // ── Rollback ──
  rollbackProgress: (prevProgress) => {
    const current = get().roadmapData;
    if (!current) return;

    set({
      roadmapData: {
        ...current,
        progress: prevProgress,
      },
    });

    logger.info("Progress rolled back to snapshot");
  },
}));
