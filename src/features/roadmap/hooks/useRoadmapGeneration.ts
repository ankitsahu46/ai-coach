import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { mutate } from "swr";
import type { Role } from "@/types";
import type { NormalizedRoadmap } from "../types";
import { logger } from "../utils/logger";

const STALE_CACHE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const UX_DELAY_MS = 5000; // 5 seconds before showing generic delay notice

/**
 * useRoadmapGeneration
 *
 * Data flow:
 * 1. If authenticated (session exists) → GET from DB → cache in localStorage
 *    - If not in DB → POST (AI generate + persist) → cache
 * 2. If unauthenticated → localStorage cache only → POST (AI generate) if miss
 * 3. Toggle completion → optimistic UI + localStorage → PATCH to DB if authenticated
 *
 * Security: userId is fetched implicitly via session headers, never sent from client payload.
 */
export function useRoadmapGeneration(selectedRole: Role | null) {
  // Session handling replaces client-provided userId
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const isAuthenticated = status === "authenticated";

  // Refs to track current auth state — prevents stale closures in callbacks
  const isAuthenticatedRef = useRef(isAuthenticated);
  const userIdRef = useRef(userId);
  isAuthenticatedRef.current = isAuthenticated;
  userIdRef.current = userId;

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
   * Cache is scoped by userId to prevent cross-account pollution on shared devices
   */
  const getCachedRoadmap = useCallback((roleId: string, uid?: string): NormalizedRoadmap | null => {
    try {
      const scopeKey = uid ? `user_${uid}` : "guest";
      const stored = localStorage.getItem(`roadmap:${scopeKey}:${roleId}`);
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
   * Cache a roadmap to localStorage scoped by user
   */
  const cacheRoadmap = useCallback((roleId: string, roadmap: NormalizedRoadmap, uid?: string) => {
    try {
      const scopeKey = uid ? `user_${uid}` : "guest";
      localStorage.setItem(`roadmap:${scopeKey}:${roleId}`, JSON.stringify(roadmap));
    } catch {
      logger.warn("localStorage quota exceeded or disabled; unable to cache roadmap.");
    }
  }, []);

  /**
   * Fetch roadmap from DB via GET /api/roadmap
   * userId is automatically determined server-side from session cookies.
   */
  const fetchFromDB = useCallback(async (
    roleId: string,
    signal: AbortSignal
  ): Promise<NormalizedRoadmap | null> => {
    try {
      const response = await fetch(
        `/api/roadmap?roleId=${encodeURIComponent(roleId)}`,
        { signal }
      );

      if (response.status === 404) {
        return null; // Not found — will generate
      }

      if (response.status === 401) {
        // Just in case session dropped between client render and fetch
        logger.warn("Session dropped or invalid, 401 received during SWR sync.");
        return null; 
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
   * Migrate Guest Roadmap to Authenticated DB Profile
   */
  const migrateToDB = useCallback(async (
    guestRoadmap: NormalizedRoadmap,
    signal: AbortSignal
  ): Promise<NormalizedRoadmap> => {
    const response = await fetch("/api/roadmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleTitle: guestRoadmap.roleTitle || guestRoadmap.role,
        roleId: guestRoadmap.roleId,
        importedRoadmap: guestRoadmap, // The payload trigger for direct DB conversion
      }),
      signal,
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Failed to migrate roadmap.");
    }

    const json = await response.json();
    return json.data as NormalizedRoadmap;
  }, []);

  /**
   * Generate roadmap via POST /api/roadmap
   * userId is automatically determined server-side from session cookies.
   */
  const generateRoadmap = useCallback(async (role: Role) => {
    // Frontend Idempotency Deduplication Guard
    if (currentPromiseRef.current) {
      logger.warn("Generation already in flight. Deduplicating.");
      return await currentPromiseRef.current;
    }

    const executeFetch = async () => {
      setIsLoading(true);
      setIsDelayedUX(false);
      setError(null);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const delayTimer = setTimeout(() => {
        setIsDelayedUX(true);
      }, UX_DELAY_MS);

      try {
        const endpoint = isAuthenticatedRef.current ? "/api/roadmap" : "/api/roadmap/guest";
        
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roleTitle: role.title,
            roleDescription: role.description,
            roleId: role.id,
            // SECURITY: userId is intentionally omitted. It is handled by the server session.
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Failed to generate roadmap via ${endpoint}`);
        }

        const raw = await response.json();
        const generatedRoadmap: NormalizedRoadmap = raw.data;

        logger.info("Roadmap fully synced via Endpoint", { role: role.title });

        // Cache in localStorage scoped to the current user (if any)
        cacheRoadmap(role.id, generatedRoadmap, userIdRef.current);
        setData(generatedRoadmap);
        
        // ANALYTICS TRACKING
        if (!isAuthenticatedRef.current) {
          logger.info("ANALYTICS: guest_generated", { roleId: role.id });
        }
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

    currentPromiseRef.current = executeFetch();

    try {
      await currentPromiseRef.current;
    } finally {
      currentPromiseRef.current = null;
    }
  }, [cacheRoadmap]);

  // ============================================
  // AUTO-LOAD: mount / role change / session resolved
  // ============================================
  // We derive a boolean "sessionResolved" so the effect only runs once the
  // session is known (not "loading"), preventing double-fires during auth transition.
  const sessionResolved = status !== "loading";

  useEffect(() => {
    if (!selectedRole || !sessionResolved) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const load = async () => {
      // Read current auth state from refs (always fresh, no stale closure)
      const authNow = isAuthenticatedRef.current;
      const uidNow = userIdRef.current;

      if (authNow) {
        // ── AUTHENTICATED FLOW ──
        const cached = getCachedRoadmap(selectedRole.id, uidNow);

        if (cached) {
          logger.info("Auth Cache Hit (SWR)", { role: selectedRole.title });
          setData(cached);
          setIsLoading(false);
          setError(null);
        } else {
          setIsLoading(true);
          setError(null);
        }

        // Fetch DB in background
        logger.info(`Authenticated: Background DB sync for role=${selectedRole.id}`);
        const dbRoadmap = await fetchFromDB(selectedRole.id, controller.signal);

        // --- GUEST TO AUTH MIGRATION ENGINE ---
        const guestData = getCachedRoadmap(selectedRole.id, undefined);
        const migrationKey = `migration_done_${uidNow}_${selectedRole.id}`;

        const isMigrationLocked = () => {
          const raw = localStorage.getItem(migrationKey);
          if (!raw) return false;
          try {
            const parsed = JSON.parse(raw);
            const ageHours = (Date.now() - parsed.at) / (1000 * 60 * 60);
            return ageHours < 24;
          } catch {
            return raw === "true";
          }
        };

        const hasMigrated = isMigrationLocked();

        if (guestData && !hasMigrated) {
          if (!dbRoadmap) {
            logger.info("Migration Engine: Converting guest roadmap to DB.", { role: selectedRole.title });
            try {
              const migratedData = await migrateToDB(guestData, controller.signal);
              localStorage.setItem(migrationKey, JSON.stringify({ done: true, at: Date.now() }));
              localStorage.removeItem(`roadmap:guest:${selectedRole.id}`);
              cacheRoadmap(selectedRole.id, migratedData, uidNow);
              setData(migratedData);
              setIsLoading(false);
              if (typeof window !== "undefined") {
                alert("Your roadmap has been successfully saved to your account.");
              }
              logger.info("ANALYTICS: migration_success", { roleId: selectedRole.id });
              return;
            } catch (err: any) {
              if (err.name === "AbortError") return;
              logger.error("Migration Engine failed. Guest cache preserved.", err.message);
              setData(guestData);
              setIsLoading(false);
              return;
            }
          } else {
            logger.info("Guest roadmap discarded due to existing DB data", { userId: uidNow, roleId: selectedRole.id });
            localStorage.setItem(migrationKey, JSON.stringify({ done: true, at: Date.now() }));
            localStorage.removeItem(`roadmap:guest:${selectedRole.id}`);
          }
        }

        // --- STANDARD DB HIT ---
        if (dbRoadmap) {
          logger.info("DB Hit", { role: selectedRole.title });
          cacheRoadmap(selectedRole.id, dbRoadmap, uidNow);
          setData(dbRoadmap);
          setIsLoading(false);
          return;
        }

        // Not in DB AND no guest data → generate via AI + persist
        logger.info("DB Miss — generating via AI", { role: selectedRole.title });
        await generateRoadmap(selectedRole);
      } else {
        // ── UNAUTHENTICATED FLOW ──
        const cached = getCachedRoadmap(selectedRole.id);
        if (cached) {
          logger.info("Guest Cache Hit", { role: selectedRole.title });
          setData(cached);
          setIsLoading(false);
          setError(null);
        } else {
          logger.info("Guest Cache Miss", { role: selectedRole.title });
          await generateRoadmap(selectedRole);
        }
      }
    };

    load().catch((err) => {
      if (err.name !== "AbortError") {
        logger.error("Load flow failed:", err.message);
      }
    });

    return () => {
      controller.abort();
    };
  }, [selectedRole, sessionResolved, getCachedRoadmap, cacheRoadmap, fetchFromDB, generateRoadmap, migrateToDB]);

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

      previousData = currentData;

      const updatedTopics = [...currentData.topics];
      updatedTopics[topicIndex] = {
        ...updatedTopics[topicIndex],
        completed: !updatedTopics[topicIndex].completed,
      };

      optimisticData = {
        ...currentData,
        topics: updatedTopics,
      };

      // Sync localStorage immediately (optimistic)
      cacheRoadmap(currentData.roleId, optimisticData, userIdRef.current);

      return optimisticData;
    });

    if (!optimisticData) return;

    logger.info("Topic completed status toggled", { topicId });

    // Globally update SWR cache with optimistic data so Dashboard syncs instantly BEFORE server
    mutate(`/api/roadmap?roleId=${(optimisticData as NormalizedRoadmap).roleId}`, optimisticData, { revalidate: false });

    // If authenticated → sync to DB via PATCH
    if (isAuthenticatedRef.current && optimisticData) {
      const newCompleted = (optimisticData as NormalizedRoadmap).topics.find(
        t => t.id === topicId
      )?.completed;

      try {
        const response = await fetch("/api/roadmap", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // userId omitted. Handled by server session
            roleId: (optimisticData as NormalizedRoadmap).roleId,
            topicId,
            completed: newCompleted,
          }),
        });

        if (!response.ok) {
          throw new Error("PATCH failed");
        }

        // Use server-confirmed response to update state authoritatively.
        // This ensures localStorage matches DB exactly, preventing
        // stale cache from poisoning future page loads.
        const patchResult = await response.json();
        if (patchResult.data) {
          const confirmedRoadmap = patchResult.data as NormalizedRoadmap;
          setData(confirmedRoadmap);
          cacheRoadmap(confirmedRoadmap.roleId, confirmedRoadmap, userId);
        }

        // Trigger SWR background revalidation for Dashboard consistency
        mutate(`/api/roadmap?roleId=${(optimisticData as NormalizedRoadmap).roleId}`);
      } catch (err) {
        // ROLLBACK: revert UI + localStorage + SWR cache
        logger.error("Failed to sync completion to DB. Rolling back.");

        if (previousData) {
          setData(previousData);
          cacheRoadmap((previousData as NormalizedRoadmap).roleId, previousData as NormalizedRoadmap, userId);
          mutate(`/api/roadmap?roleId=${(previousData as NormalizedRoadmap).roleId}`, previousData, { revalidate: true });
        }
      }
    }
  }, [cacheRoadmap]);

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
