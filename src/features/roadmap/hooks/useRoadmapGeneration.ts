import { useState, useEffect, useCallback, useRef } from "react";
import type { Role } from "@/types";
import type { NormalizedRoadmap } from "../types";
import { logger } from "../utils/logger";

const STALE_CACHE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const UX_DELAY_MS = 5000; // 5 seconds before showing generic delay notice

/**
 * useRoadmapGeneration
 *
 * Data flow:
 * 1. If userId exists (authenticated) → GET from DB → cache in localStorage
 *    - If not in DB → POST (AI generate + persist) → cache
 * 2. If no userId (unauthenticated) → localStorage cache only → POST if miss
 * 3. Toggle completion → optimistic UI + localStorage → PATCH to DB if authenticated
 *
 * TODO: Replace userId param with session-based auth (NextAuth)
 * Currently accepts userId as a parameter — in production this should
 * come from a server-side session, never from the client.
 */
export function useRoadmapGeneration(
  selectedRole: Role | null,
  userId?: string | null // Future: replace with useSession() from auth provider
) {
  // State
  const [data, setData] = useState<NormalizedRoadmap | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDelayedUX, setIsDelayedUX] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep track of the active request so we can cancel it if effect unmounts
  const abortControllerRef = useRef<AbortController | null>(null);

  // Frontend Idempotency Promise Scope
  const currentPromiseRef = useRef<Promise<void> | null>(null);

  /**
   * Safe getter for localStorage with stale verification
   */
  const getCachedRoadmap = useCallback((roleId: string): NormalizedRoadmap | null => {
    try {
      const stored = localStorage.getItem(`roadmap:${roleId}`);
      if (!stored) return null;

      const parsed: NormalizedRoadmap = JSON.parse(stored);
      const ageMs = Date.now() - new Date(parsed.createdAt).getTime();

      if (ageMs > STALE_CACHE_MS) {
        logger.info(`Cache for ${roleId} is STALE. Ignoring.`);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }, []);

  /**
   * Cache a roadmap to localStorage
   */
  const cacheRoadmap = useCallback((roleId: string, roadmap: NormalizedRoadmap) => {
    try {
      localStorage.setItem(`roadmap:${roleId}`, JSON.stringify(roadmap));
    } catch {
      logger.warn("localStorage quota exceeded or disabled; unable to cache roadmap.");
    }
  }, []);

  /**
   * Fetch roadmap from DB via GET /api/roadmap
   */
  const fetchFromDB = useCallback(async (
    roleId: string,
    uid: string,
    signal: AbortSignal
  ): Promise<NormalizedRoadmap | null> => {
    try {
      const response = await fetch(
        `/api/roadmap?roleId=${encodeURIComponent(roleId)}&userId=${encodeURIComponent(uid)}`,
        { signal }
      );

      if (response.status === 404) {
        return null; // Not found — will generate
      }

      if (!response.ok) {
        throw new Error("Failed to fetch roadmap from server.");
      }

      const json = await response.json();
      return json.data as NormalizedRoadmap;
    } catch (err: any) {
      if (err.name === "AbortError") throw err; // Re-throw abort
      logger.warn("DB fetch failed, falling back to generation:", err.message);
      return null;
    }
  }, []);

  /**
   * Generate roadmap via POST /api/roadmap
   */
  const generateRoadmap = useCallback(async (role: Role) => {
    // Frontend Idempotency Deduplication Guard
    if (currentPromiseRef.current) {
      logger.warn("Generation already in flight. Deduplicating — returning shared promise.");
      return await currentPromiseRef.current;
    }

    const executeFetch = async () => {
      setIsLoading(true);
      setIsDelayedUX(false);
      setError(null);

      // Cancel any rapidly preceding fetch immediately
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // UX trigger mapping
      const delayTimer = setTimeout(() => {
        setIsDelayedUX(true);
      }, UX_DELAY_MS);

      try {
        const response = await fetch("/api/roadmap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roleTitle: role.title,
            roleDescription: role.description,
            roleId: role.id,
            ...(userId ? { userId } : {}), // Only include if authenticated
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to generate roadmap.");
        }

        const raw = await response.json();
        const generatedRoadmap: NormalizedRoadmap = raw.data;

        logger.info("Roadmap fully synced via Endpoint", { role: role.title });

        // Cache in localStorage
        cacheRoadmap(role.id, generatedRoadmap);
        setData(generatedRoadmap);
      } catch (err: any) {
        if (err.name === "AbortError") {
          logger.info("Fetch willfully aborted via route mismatch/teardown.");
        } else {
          logger.error("Generation encountered fetch error:", err.message);
          setError(err.message || "An unexpected error occurred while generating your roadmap.");
        }
      } finally {
        clearTimeout(delayTimer);
        setIsLoading(false);
      }
    };

    // Assign to active flight lock
    currentPromiseRef.current = executeFetch();

    try {
      await currentPromiseRef.current;
    } finally {
      currentPromiseRef.current = null;
    }
  }, [userId, cacheRoadmap]);

  // ============================================
  // AUTO-LOAD: mount / role change
  // ============================================
  useEffect(() => {
    if (!selectedRole) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const load = async () => {
      if (userId) {
        // ── AUTHENTICATED FLOW (SWR) ──
        // 1. Stale-While-Revalidate: Try Cache First
        const cached = getCachedRoadmap(selectedRole.id);

        if (cached) {
          logger.info("Auth Cache Hit (SWR)", { role: selectedRole.title });
          setData(cached);
          setIsLoading(false); // Show instantly, drop loading state
          setError(null);
        } else {
          setIsLoading(true);
          setError(null);
        }

        // 2. Fetch DB in background
        logger.info(`Authenticated: Background DB sync for role=${selectedRole.id}`);
        const dbRoadmap = await fetchFromDB(selectedRole.id, userId, controller.signal);

        if (dbRoadmap) {
          logger.info("DB Hit", { role: selectedRole.title });
          
          // SWR Swap Notification
          if (cached) {
            const isDifferent = JSON.stringify(cached.topics) !== JSON.stringify(dbRoadmap.topics);
            if (isDifferent) {
              logger.info("SWR determined background DB sync differs from local cache.");
              // TODO: Replace with a toast library like Sonner or react-hot-toast
              if (typeof window !== "undefined") {
                alert("Your roadmap has been silently updated to reflect progress from another device.");
              }
            }
          }

          cacheRoadmap(selectedRole.id, dbRoadmap); // Sync LocalStorage
          setData(dbRoadmap); // Update UI silently if differences exist
          setIsLoading(false); // Ensure loading is off if we were waiting
          return;
        }

        // 3. Not in DB → generate via AI + persist
        logger.info("DB Miss — generating via AI", { role: selectedRole.title });
        setIsLoading(false); // generateRoadmap manages its own loading state
        await generateRoadmap(selectedRole);
      } else {
        // ── UNAUTHENTICATED FLOW (unchanged) ──
        const cached = getCachedRoadmap(selectedRole.id);

        if (cached) {
          logger.info("Cache Hit", { role: selectedRole.title });
          setData(cached);
          setIsLoading(false);
          setError(null);
        } else {
          logger.info("Cache Miss", { role: selectedRole.title });
          await generateRoadmap(selectedRole);
        }
      }
    };

    load().catch((err) => {
      if (err.name !== "AbortError") {
        logger.error("Load flow failed:", err.message);
      }
    });

    // Cleanup aborts active request if user navigates away
    return () => {
      controller.abort();
    };
  }, [selectedRole, userId, getCachedRoadmap, cacheRoadmap, fetchFromDB, generateRoadmap]);

  // ============================================
  // TOGGLE COMPLETION — Optimistic + DB sync
  // ============================================
  const toggleTopicCompletion = useCallback(async (topicId: string) => {
    let optimisticData: NormalizedRoadmap | null = null;
    let previousData: NormalizedRoadmap | null = null;

    setData((currentData) => {
      if (!currentData) return currentData;

      const topicIndex = currentData.topics.findIndex(t => t.id === topicId);
      if (topicIndex === -1) return currentData;

      // Snapshot for rollback
      previousData = currentData;

      const updatedTopics = [...currentData.topics];
      updatedTopics[topicIndex] = {
        ...updatedTopics[topicIndex],
        completed: !updatedTopics[topicIndex].completed,
      };

      optimisticData = {
        ...currentData,
        topics: updatedTopics,
        updatedAt: new Date().toISOString(),
      };

      // Sync localStorage immediately (optimistic)
      cacheRoadmap(currentData.roleId, optimisticData);

      return optimisticData;
    });

    if (!optimisticData) return;

    logger.info("Topic completed status toggled", { topicId });

    // If authenticated → sync to DB via PATCH
    if (userId && optimisticData) {
      const newCompleted = (optimisticData as NormalizedRoadmap).topics.find(
        t => t.id === topicId
      )?.completed;

      try {
        const response = await fetch("/api/roadmap", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            roleId: (optimisticData as NormalizedRoadmap).roleId,
            topicId,
            completed: newCompleted,
          }),
        });

        if (!response.ok) {
          throw new Error("PATCH failed");
        }

        logger.info("Topic completion synced to DB", { topicId, completed: newCompleted });
      } catch (err) {
        // ROLLBACK: revert UI + localStorage
        logger.error("Failed to sync completion to DB. Rolling back.");

        if (previousData) {
          setData(previousData);
          cacheRoadmap((previousData as NormalizedRoadmap).roleId, previousData as NormalizedRoadmap);
        }
      }
    }
  }, [userId, cacheRoadmap]);

  // ============================================
  // DERIVED STATE
  // ============================================
  const completedCount = data?.topics.filter(t => t.completed).length || 0;
  const progressPercentage = !data || data.topics.length === 0
    ? 0
    : Math.round((completedCount / data.topics.length) * 100);

  return {
    roadmapData: data,
    completedCount,
    progressPercentage,
    isLoading,
    isDelayedUX,
    error,
    retryGenerate: () => selectedRole && generateRoadmap(selectedRole),
    toggleTopicCompletion,
  };
}
