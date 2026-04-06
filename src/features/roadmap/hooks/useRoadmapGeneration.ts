import { useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import type { Role } from "@/types";
import type { NormalizedRoadmap } from "../types";
import { logger } from "../utils/logger";
import {
  useRoadmapStore,
  getCachedRoadmap,
  setCachedRoadmap,
} from "../store/useRoadmapStore";

const UX_DELAY_MS = 5000;

// ============================================
// useRoadmapGeneration
// ============================================
// Orchestration hook for the Roadmap page.
// Reads/writes state via the global Zustand store.
// Handles: loading from DB/cache, AI generation, guest migration.
//
// The store (useRoadmapStore) is the SINGLE SOURCE OF TRUTH.
// This hook just coordinates data fetching logic.
// ============================================

export function useRoadmapGeneration(selectedRole: Role | null) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const isAuthenticated = status === "authenticated";

  // Refs for always-current auth state (no stale closures)
  const isAuthRef = useRef(isAuthenticated);
  const userIdRef = useRef(userId);
  isAuthRef.current = isAuthenticated;
  userIdRef.current = userId;

  // ── Zustand store ──
  const roadmapData = useRoadmapStore((s) => s.roadmapData);
  const isLoading = useRoadmapStore((s) => s.isLoading);
  const isDelayedUX = useRoadmapStore((s) => s.isDelayedUX);
  const error = useRoadmapStore((s) => s.error);
  const setRoadmapData = useRoadmapStore((s) => s.setRoadmapData);
  const setLoading = useRoadmapStore((s) => s.setLoading);
  const setDelayedUX = useRoadmapStore((s) => s.setDelayedUX);
  const setError = useRoadmapStore((s) => s.setError);
  const toggleTopicCompletion = useRoadmapStore((s) => s.toggleTopicCompletion);

  // Abort + idempotency refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentPromiseRef = useRef<Promise<void> | null>(null);

  // ── Fetch from DB (GET /api/roadmap) ──
  const fetchFromDB = useCallback(
    async (roleId: string, signal: AbortSignal): Promise<NormalizedRoadmap | null> => {
      try {
        const res = await fetch(`/api/roadmap?roleId=${encodeURIComponent(roleId)}`, { signal });
        if (res.status === 404 || res.status === 401) return null;
        if (!res.ok) throw new Error("Failed to fetch roadmap from server.");
        const json = await res.json();
        return json.data as NormalizedRoadmap;
      } catch (err: any) {
        if (err.name === "AbortError") throw err;
        logger.warn("DB fetch failed:", err.message);
        return null;
      }
    },
    []
  );

  // ── Migrate guest → DB (POST /api/roadmap with importedRoadmap) ──
  const migrateToDB = useCallback(
    async (guestRoadmap: NormalizedRoadmap, signal: AbortSignal): Promise<NormalizedRoadmap> => {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleTitle: guestRoadmap.roleTitle || guestRoadmap.role,
          roleId: guestRoadmap.roleId,
          importedRoadmap: guestRoadmap,
        }),
        signal,
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to migrate roadmap.");
      }
      const json = await res.json();
      return json.data as NormalizedRoadmap;
    },
    []
  );

  // ── Generate via AI (POST) ──
  const generateRoadmap = useCallback(
    async (role: Role) => {
      if (currentPromiseRef.current) {
        logger.warn("Generation already in flight. Deduplicating.");
        return await currentPromiseRef.current;
      }

      const execute = async () => {
        setLoading(true);
        setDelayedUX(false);
        setError(null);

        if (abortControllerRef.current) abortControllerRef.current.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const delayTimer = setTimeout(() => setDelayedUX(true), UX_DELAY_MS);

        try {
          const endpoint = isAuthRef.current ? "/api/roadmap" : "/api/roadmap/guest";
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              roleTitle: role.title,
              roleDescription: role.description,
              roleId: role.id,
            }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || `Failed to generate roadmap via ${endpoint}`);
          }

          const raw = await res.json();
          const generated: NormalizedRoadmap = raw.data;

          logger.info("Roadmap generated", { role: role.title });
          setCachedRoadmap(role.id, generated, userIdRef.current);
          setRoadmapData(generated);
        } catch (err: any) {
          if (err.name === "AbortError") {
            logger.info("Fetch aborted.");
          } else {
            logger.error("Generation error:", err.message);
            setError(err.message || "An unexpected error occurred.");
          }
        } finally {
          clearTimeout(delayTimer);
          setLoading(false);
        }
      };

      currentPromiseRef.current = execute();
      try {
        await currentPromiseRef.current;
      } finally {
        currentPromiseRef.current = null;
      }
    },
    [setLoading, setDelayedUX, setError, setRoadmapData]
  );

  // ============================================
  // AUTO-LOAD: mount / role change / session resolved
  // ============================================
  const sessionResolved = status !== "loading";

  useEffect(() => {
    if (!selectedRole || !sessionResolved) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const load = async () => {
      const authNow = isAuthRef.current;
      const uidNow = userIdRef.current;

      if (authNow) {
        // ── AUTHENTICATED FLOW ──
        const cached = getCachedRoadmap(selectedRole.id, uidNow);
        if (cached) {
          logger.info("Auth Cache Hit", { role: selectedRole.title });
          setRoadmapData(cached);
          setLoading(false);
          setError(null);
        } else {
          setLoading(true);
          setError(null);
        }

        const dbRoadmap = await fetchFromDB(selectedRole.id, controller.signal);

        // Guest → Auth migration
        const guestData = getCachedRoadmap(selectedRole.id, undefined);
        const migrationKey = `migration_done_${uidNow}_${selectedRole.id}`;
        const isMigrationLocked = () => {
          const raw = localStorage.getItem(migrationKey);
          if (!raw) return false;
          try {
            return (Date.now() - JSON.parse(raw).at) / 3600000 < 24;
          } catch {
            return raw === "true";
          }
        };

        if (guestData && !isMigrationLocked()) {
          if (!dbRoadmap) {
            logger.info("Migrating guest → DB", { role: selectedRole.title });
            try {
              const migrated = await migrateToDB(guestData, controller.signal);
              localStorage.setItem(migrationKey, JSON.stringify({ done: true, at: Date.now() }));
              localStorage.removeItem(`roadmap:guest:${selectedRole.id}`);
              setCachedRoadmap(selectedRole.id, migrated, uidNow);
              setRoadmapData(migrated);
              setLoading(false);
              return;
            } catch (err: any) {
              if (err.name === "AbortError") return;
              logger.error("Migration failed", err.message);
              setRoadmapData(guestData);
              setLoading(false);
              return;
            }
          } else {
            localStorage.setItem(migrationKey, JSON.stringify({ done: true, at: Date.now() }));
            localStorage.removeItem(`roadmap:guest:${selectedRole.id}`);
          }
        }

        // DB is source of truth for authenticated users
        if (dbRoadmap) {
          logger.info("DB Hit", { role: selectedRole.title });
          setCachedRoadmap(selectedRole.id, dbRoadmap, uidNow);
          setRoadmapData(dbRoadmap);
          setLoading(false);
          return;
        }

        // No DB data → generate via AI
        logger.info("DB Miss — generating via AI", { role: selectedRole.title });
        await generateRoadmap(selectedRole);
      } else {
        // ── GUEST FLOW ──
        const cached = getCachedRoadmap(selectedRole.id);
        if (cached) {
          logger.info("Guest Cache Hit", { role: selectedRole.title });
          setRoadmapData(cached);
          setLoading(false);
          setError(null);
        } else {
          logger.info("Guest Cache Miss — generating", { role: selectedRole.title });
          await generateRoadmap(selectedRole);
        }
      }
    };

    load().catch((err) => {
      if (err.name !== "AbortError") logger.error("Load flow failed:", err.message);
    });

    return () => controller.abort();
  }, [selectedRole, sessionResolved, fetchFromDB, generateRoadmap, migrateToDB, setRoadmapData, setLoading, setError]);

  // ── Derived state ──
  const completedCount = roadmapData?.topics.filter((t) => t.completed).length || 0;
  const progressPercentage =
    !roadmapData || roadmapData.topics.length === 0
      ? 0
      : Math.round((completedCount / roadmapData.topics.length) * 100);

  // ── Bound toggle: Orchestrates state + API side-effects ──
  // Per-topic in-flight tracker — allows concurrent PATCHes for DIFFERENT topics
  // while preventing rapid spam on the SAME topic (C-01 fix)
  const inFlightTopicsRef = useRef<Set<string>>(new Set());
  const consistencyDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const pendingConsistencyCountRef = useRef(0);

  const boundToggle = useCallback(
    async (topicId: string) => {
      // Snapshot pre-toggle state for rollback (H-01 fix)
      const snapshotBeforeToggle = useRoadmapStore.getState().roadmapData;
      if (!snapshotBeforeToggle) return;
      const topicIndex = snapshotBeforeToggle.topics.findIndex((t) => t.id === topicId);
      if (topicIndex === -1) return;
      const isCompletedNow = !snapshotBeforeToggle.topics[topicIndex].completed;

      // Update Zustand globally (optimistic)
      toggleTopicCompletion(topicId, isAuthRef.current, userIdRef.current);

      if (!isAuthRef.current) return; // Guests stop here — localStorage already synced

      // Per-topic dedup: block only the SAME topic if already in-flight
      if (inFlightTopicsRef.current.has(topicId)) {
        // Rollback: this toggle was optimistic but we can't sync it
        logger.warn("Topic PATCH already in-flight — rolling back optimistic toggle", { topicId });
        setRoadmapData(snapshotBeforeToggle);
        setCachedRoadmap(snapshotBeforeToggle.roleId, snapshotBeforeToggle, userIdRef.current);
        return;
      }

      inFlightTopicsRef.current.add(topicId);

      try {
        const patchRes = await fetch("/api/roadmap", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roleId: snapshotBeforeToggle.roleId,
            topicId,
            completed: isCompletedNow,
          }),
        });

        if (!patchRes.ok) throw new Error("PATCH failed");
        
        const json = await patchRes.json();
        if (json.data) {
          // Confirm with server-source
          const confirmed = json.data as NormalizedRoadmap;
          setRoadmapData(confirmed);
          setCachedRoadmap(confirmed.roleId, confirmed, userIdRef.current);

          // Calculate net positive checks for debounce
          pendingConsistencyCountRef.current += isCompletedNow ? 1 : -1;

          if (consistencyDebounceRef.current) {
            clearTimeout(consistencyDebounceRef.current);
          }
          
          // Flush all accumulated completions after 2 seconds of inactivity
          consistencyDebounceRef.current = setTimeout(() => {
            const netCount = pendingConsistencyCountRef.current;
            pendingConsistencyCountRef.current = 0; // Reset for next batch

            // Send single batch log request with mathematically true count
            if (netCount > 0) {
              fetch("/api/consistency/log", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    roleId: snapshotBeforeToggle.roleId,
                    action: "TOPIC_COMPLETED",
                    count: netCount
                  })
              })
              .then(res => {
                if (!res.ok) throw new Error("Consistency batch log failed");
                return res.json();
              })
              .then(json => {
                  if (json.data) {
                    useRoadmapStore.getState().setConsistencyData(json.data);
                  }
              })
              .catch(err => logger.error("Debounced Consistency batch log failed", err));
            }
          }, 2000);
        }
      } catch (err: any) {
        // Rollback to pre-toggle snapshot on ANY failure
        logger.error("API update failed — rolling back to previous state", err);
        setRoadmapData(snapshotBeforeToggle);
        setCachedRoadmap(snapshotBeforeToggle.roleId, snapshotBeforeToggle, userIdRef.current);
      } finally {
        inFlightTopicsRef.current.delete(topicId);
      }
    },
    [toggleTopicCompletion, setRoadmapData]
  );

  // Do NOT cancel the debounce on unmount (FIX: Data Loss on immediate navigation)
  // We want the pending consistency log API call to fire even if the user leaves the page.
  useEffect(() => {
    return () => {
       // Deliberately left empty
    };
  }, []);

  return {
    roadmapData,
    completedCount,
    progressPercentage,
    isLoading,
    isDelayedUX,
    error,
    retryGenerate: () => selectedRole && generateRoadmap(selectedRole),
    toggleTopicCompletion: boundToggle,
  };
}
