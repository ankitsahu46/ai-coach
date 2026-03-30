import { useState, useEffect, useCallback, useRef } from "react";
import type { Role } from "@/types";
import type { NormalizedRoadmap } from "../types";
import { logger } from "../utils/logger";

const STALE_CACHE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const UX_DELAY_MS = 5000; // 5 seconds before showing generic delay notice

export function useRoadmapGeneration(selectedRole: Role | null) {
  // State 
  const [data, setData] = useState<NormalizedRoadmap | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDelayedUX, setIsDelayedUX] = useState(false); // Used to toggle "Still generating..."
  const [error, setError] = useState<string | null>(null);

  // Keep track of the active request so we can cancel it if standard effect unmounts
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 2. Frontend Idempotency Promise Scope
  const currentPromiseRef = useRef<Promise<void> | null>(null);

  /**
   * Safe getter for local storage with Stale verification
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
   * Fetch the roadmap from the AI endpoint
   */
  const generateRoadmap = useCallback(async (role: Role) => {
    // 2. Frontend Idempotency Deduplication Guard
    if (currentPromiseRef.current) {
      logger.warn("Generation already in flight. Deduplicating returning shared promise.");
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

        try {
          localStorage.setItem(`roadmap:${role.id}`, JSON.stringify(generatedRoadmap));
        } catch (e: any) {
          logger.warn("localStorage quota exceeded or disabled; unable to cache roadmap.");
        }

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
      // 2b. Safely clear the promise to explicitly prevent permanent memory locks
      currentPromiseRef.current = null;
    }
  }, []);

  // Architecture: Auto-load or Auto-generate on mount / role change
  useEffect(() => {
    if (!selectedRole) return;

    // TODO: Connect real Auth provider here
    const user = null; // Mock authenticated user

    if (user) {
      logger.info(`User Authenticated. Checking DB for role: ${selectedRole.id}`);
    } else {
      // First attempt to load from local cache
      const cached = getCachedRoadmap(selectedRole.id);

      if (cached) {
        logger.info(`Cache Hit`, { role: selectedRole.title });
        setData(cached);
        setIsLoading(false);
        setError(null);
      } else {
        logger.info(`Cache Miss`, { role: selectedRole.title });
        generateRoadmap(selectedRole);
      }
    }

    // Cleanup aborts active request if user rapidly flips roles or navigates away
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedRole, getCachedRoadmap, generateRoadmap]);

  /**
   * Optimistic update for toggling completion states inside React, 
   * syncing local storage, and simulating robust rollback hooks.
   */
  const toggleTopicCompletion = useCallback(async (topicId: string) => {
    let optimisticData: NormalizedRoadmap | null = null;

    setData((currentData) => {
      if (!currentData) return currentData;
      
      const topicIndex = currentData.topics.findIndex(t => t.id === topicId);
      if (topicIndex === -1) return currentData;

      const previousTopics = [...currentData.topics];
      const previousState = previousTopics[topicIndex].completed;
      const updatedTopics = [...currentData.topics];
      updatedTopics[topicIndex] = { ...updatedTopics[topicIndex], completed: !previousState };

      optimisticData = {
        ...currentData,
        topics: updatedTopics
      };

      try {
        localStorage.setItem(`roadmap:${currentData.roleId}`, JSON.stringify(optimisticData));
      } catch (err) {
        logger.error(`Optimistic validation failed syncing to local storage bounds.`);
      }

      return optimisticData;
    });

    if (!optimisticData) return;
    
    logger.info("Topic completed status toggled", { topicId });

    try {
      await Promise.resolve();
    } catch (err) {
      logger.error("Failed to sync completion state with backend. Rolling back UI.");
      
      setData((currentData) => {
         if (!currentData) return currentData;
         const topicIdx = currentData.topics.findIndex(t => t.id === topicId);
         if (topicIdx === -1) return currentData;
         
         const previousTopics = [...currentData.topics];
         const previousState = previousTopics[topicIdx].completed;
         const revertedTopics = [...currentData.topics];
         revertedTopics[topicIdx] = { ...revertedTopics[topicIdx], completed: !previousState };
         
         const revertedData = { ...currentData, topics: revertedTopics };
         try {
           localStorage.setItem(`roadmap:${revertedData.roleId}`, JSON.stringify(revertedData));
         } catch { } // Silence rollback cache faults
         
         return revertedData;
      });
    }
  }, []);

  // 3. Derived State Mappings for Safe React Scaling
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
    toggleTopicCompletion
  };
}
