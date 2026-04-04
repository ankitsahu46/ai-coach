import { create } from "zustand";
import type { NormalizedRoadmap } from "../types";
import { logger } from "../utils/logger";

// ============================================
// ROADMAP ZUSTAND STORE — Single Source of Truth
// ============================================
// This store is the ONLY place roadmap data lives on the client.
// Both the Roadmap page and Dashboard read from here.
//
// Architecture:
//   UI (RoadmapPage, Dashboard) → reads from store
//   toggleCompletion → updates store + fires PATCH to DB
//   loadRoadmap (in hook) → hydrates store from DB or cache
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

  /** UI loading flags */
  isLoading: boolean;
  isDelayedUX: boolean;
  error: string | null;

  /** Simple setters */
  setRoadmapData: (data: NormalizedRoadmap | null) => void;
  setLoading: (v: boolean) => void;
  setDelayedUX: (v: boolean) => void;
  setError: (v: string | null) => void;

  /**
   * Toggle a topic's completion status.
   * 1. Updates global store immediately (optimistic).
   * 2. Syncs to localStorage.
   * 3. If authenticated, fires PATCH to MongoDB in the background.
   */
  toggleTopicCompletion: (
    topicId: string,
    isAuthenticated: boolean,
    userId?: string
  ) => void;
}

export const useRoadmapStore = create<RoadmapState>((set, get) => ({
  // ── Initial State ──
  roadmapData: null,
  isLoading: false,
  isDelayedUX: false,
  error: null,

  // ── Setters ──
  setRoadmapData: (data) => set({ roadmapData: data }),
  setLoading: (v) => set({ isLoading: v }),
  setDelayedUX: (v) => set({ isDelayedUX: v }),
  setError: (v) => set({ error: v }),

  // ── Toggle Topic Completion ──
  toggleTopicCompletion: (topicId, isAuthenticated, userId) => {
    const current = get().roadmapData;
    if (!current) return;

    const topicIndex = current.topics.findIndex((t) => t.id === topicId);
    if (topicIndex === -1) return;

    const updatedTopics = [...current.topics];
    updatedTopics[topicIndex] = {
      ...updatedTopics[topicIndex],
      completed: !updatedTopics[topicIndex].completed,
    };

    const optimistic: NormalizedRoadmap = {
      ...current,
      topics: updatedTopics,
    };

    // 1. Update global store
    set({ roadmapData: optimistic });

    // 2. Sync to localStorage
    setCachedRoadmap(current.roleId, optimistic, userId);

    logger.info("Topic completion toggled in store", { topicId, completed: updatedTopics[topicIndex].completed });
  },
}));
