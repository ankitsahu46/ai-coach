import { useEffect, useCallback, useRef, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import type { Role } from "@/types";
import type { NormalizedRoadmap, TaskAction, UserProgress } from "../types";
import { logger } from "../utils/logger";
import {
  useRoadmapStore,
  getCachedRoadmap,
  setCachedRoadmap,
} from "../store/useRoadmapStore";
import { useRoadmapStats, useRoadmapDerivedState, useTopicViews } from "../store/roadmapSelectors";
import {
  validateTransition,
  getAllTasks,
  getTaskState,
  getTaskOrNull,
  buildTaskMap,
} from "../types/shared-logic";

const UX_DELAY_MS = 5000;

// ============================================
// useRoadmapGeneration
// ============================================
// Orchestration hook for the Roadmap page.
// Reads/writes state via the global Zustand store.
// Handles: loading from DB/cache, AI generation, guest migration,
//          task action orchestration with validation + rollback.
//
// The store (useRoadmapStore) is the SINGLE SOURCE OF TRUTH.
// This hook coordinates data fetching and state transitions.
//
// Flow: UI → this hook → validateTransition → store → API → store (server sync)
// ============================================

// ── Action labels for human-readable toast messages ──
const ACTION_LABELS: Record<TaskAction, string> = {
  complete: "completed",
  uncomplete: "uncompleted",
  skip: "skipped",
  unskip: "unskipped",
};

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
  const performOptimisticUpdate = useRoadmapStore((s) => s.performOptimisticUpdate);
  const rollbackProgress = useRoadmapStore((s) => s.rollbackProgress);
  const selectedTaskId = useRoadmapStore((s) => s.selectedTaskId);
  const focusTaskId = useRoadmapStore((s) => s.focusTaskId);
  const setSelectedTaskId = useRoadmapStore((s) => s.setSelectedTaskId);
  const setFocusTaskId = useRoadmapStore((s) => s.setFocusTaskId);

  // ── Selectors (derived state via shared-logic) ──
  const derivedState = useRoadmapDerivedState(roadmapData);
  const topics = useTopicViews(roadmapData, derivedState);
  const stats = useRoadmapStats(roadmapData);

  // Abort + idempotency refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentPromiseRef = useRef<Promise<void> | null>(null);

  // ── In-flight tracking (reactive for UI button disabling) ──
  const inFlightTasksRef = useRef<Set<string>>(new Set());
  const [inFlightTasks, setInFlightTasks] = useState<Set<string>>(new Set());

  const addInFlight = useCallback((taskId: string) => {
    inFlightTasksRef.current.add(taskId);
    setInFlightTasks(new Set(inFlightTasksRef.current));
  }, []);

  const removeInFlight = useCallback((taskId: string) => {
    inFlightTasksRef.current.delete(taskId);
    setInFlightTasks(new Set(inFlightTasksRef.current));
  }, []);

  // ── Toast throttling: show on first action + every 5th milestone ──
  const actionCountRef = useRef(0);

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
          toast.success("Roadmap generated!", { description: `Your ${role.title} learning path is ready.` });
        } catch (err: any) {
          if (err.name === "AbortError") {
            logger.info("Fetch aborted.");
          } else {
            logger.error("Generation error:", err.message);
            setError(err.message || "An unexpected error occurred.");
            toast.error("Roadmap generation failed", { description: err.message });
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

  // ============================================
  // TASK ACTION ORCHESTRATOR
  // ============================================
  // Orchestrates: validate → snapshot → optimistic → API → server sync / rollback
  // Per-task in-flight tracking with guaranteed cleanup.
  // Toast feedback on success, failure, and invalid transitions.
  // Analytics events emitted for future personalization.

  const consistencyDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const pendingConsistencyCountRef = useRef(0);

  const handleTaskAction = useCallback(
    async (taskId: string, action: TaskAction): Promise<{ success: boolean; error?: string; code?: string }> => {
      const currentRoadmap = useRoadmapStore.getState().roadmapData;
      if (!currentRoadmap) return { success: false, error: "Roadmap not loaded" };

      // 1. Pre-flight validation via shared-logic
      const allTasks = getAllTasks(currentRoadmap);
      const taskMap = buildTaskMap(allTasks);
      const task = getTaskOrNull(taskMap, taskId);
      if (!task) {
        logger.warn("Task not found for action", { taskId, action });
        return { success: false, error: "Task not found" };
      }

      const transition = validateTransition(task, action, allTasks, currentRoadmap.progress);
      if (!transition.ok) {
        logger.warn("Transition rejected", { taskId, action, reason: transition.reason });
        toast.warning("Action not allowed", { id: "transition-blocked", description: transition.reason });
        return { success: false, error: transition.reason, code: "INVALID_TRANSITION" };
      }

      // 2. Dedup: check in-flight AND verify current state matches expected
      const currentState = getTaskState(task, allTasks, currentRoadmap.progress);
      if (inFlightTasksRef.current.has(taskId)) {
        logger.warn("Task action already in-flight — blocking duplicate", { taskId });
        return { success: false, error: "Action already in flight" };
      }

      // 3. Snapshot progress for rollback
      const prevProgress: UserProgress = {
        completedTaskIds: [...currentRoadmap.progress.completedTaskIds],
        skippedTaskIds: [...currentRoadmap.progress.skippedTaskIds],
      };

      // 4. Compute consistency delta from state transition
      let consistencyDelta = 0;
      if (action === "complete" && currentState === "available") {
        consistencyDelta = 1;
      } else if (action === "uncomplete" && currentState === "completed") {
        consistencyDelta = -1;
      }
      // skip/unskip don't affect consistency

      // 5. Optimistic update + mark in-flight
      addInFlight(taskId);
      performOptimisticUpdate(taskId, action);

      // 6. Optimistic consistency update
      if (consistencyDelta > 0) {
        const currentConsistency = useRoadmapStore.getState().consistencyData;
        if (currentConsistency) {
          try {
            const { computeNextConsistencyState } = require("../../consistency/utils/consistencyMath");
            const nextState = computeNextConsistencyState(currentConsistency, consistencyDelta);
            useRoadmapStore.getState().setConsistencyData(nextState);
          } catch {
            // Consistency math unavailable — non-critical
          }
        }
      }

      // 7. Analytics event (fire-and-forget for personalization)
      logger.info("analytics:task_action", {
        taskId,
        action,
        taskTitle: task.title,
        taskType: task.type,
        prevState: currentState,
        timestamp: new Date().toISOString(),
      });

      // 8. If not authenticated, sync to localStorage and stop
      if (!isAuthRef.current) {
        const updatedRoadmap = useRoadmapStore.getState().roadmapData;
        if (updatedRoadmap) {
          setCachedRoadmap(updatedRoadmap.roleId, updatedRoadmap, userIdRef.current);
        }
        removeInFlight(taskId);
        actionCountRef.current++;
        // Throttled toast: first action OR every 5th milestone
        const count = actionCountRef.current;
        if (count === 1 || count % 5 === 0) {
          await new Promise((r) => setTimeout(r, 120));
          const isMilestone = count > 1 && count % 5 === 0;
          toast.success(
            isMilestone ? `🎯 ${count} tasks done!` : `Task ${ACTION_LABELS[action]}`,
            {
              id: `task-${taskId}`,
              description: task.title,
              ...(action === "complete" ? {
                action: { label: "Undo", onClick: () => handleTaskAction(taskId, "uncomplete") },
              } : action === "skip" ? {
                action: { label: "Undo", onClick: () => handleTaskAction(taskId, "unskip") },
              } : {}),
            }
          );
        }
        return { success: true };
      }

      // 9. Fire PATCH to server
      try {
        const patchRes = await fetch("/api/roadmap", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roleId: currentRoadmap.roleId,
            taskId,
            action,
          }),
        });

        if (!patchRes.ok) {
          const errData = await patchRes.json().catch(() => ({}));
          throw new Error(errData.error || `Server returned ${patchRes.status}`);
        }

        const json = await patchRes.json();
        if (json.data) {
          // 10. Always trust server — sync server state to store
          const confirmed = json.data as NormalizedRoadmap;
          setRoadmapData(confirmed);
          setCachedRoadmap(confirmed.roleId, confirmed, userIdRef.current);

          // Throttled toast: first action OR every 5th milestone
          actionCountRef.current++;
          const count = actionCountRef.current;
          if (count === 1 || count % 5 === 0) {
            await new Promise((r) => setTimeout(r, 120));
            const isMilestone = count > 1 && count % 5 === 0;
            toast.success(
              isMilestone ? `🎯 ${count} tasks done!` : `Task ${ACTION_LABELS[action]}`,
              {
                id: `task-${taskId}`,
                description: task.title,
                ...(action === "complete" ? {
                  action: { label: "Undo", onClick: () => handleTaskAction(taskId, "uncomplete") },
                } : action === "skip" ? {
                  action: { label: "Undo", onClick: () => handleTaskAction(taskId, "unskip") },
                } : {}),
              }
            );
          }

          // Debounced consistency log
          if (consistencyDelta !== 0) {
            pendingConsistencyCountRef.current += consistencyDelta;

            if (consistencyDebounceRef.current) {
              clearTimeout(consistencyDebounceRef.current);
            }

            consistencyDebounceRef.current = setTimeout(() => {
              const netCount = pendingConsistencyCountRef.current;
              pendingConsistencyCountRef.current = 0;

              if (netCount > 0) {
                fetch("/api/consistency/log", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    roleId: currentRoadmap.roleId,
                    action: "TOPIC_COMPLETED",
                    count: netCount,
                  }),
                })
                  .then((res) => {
                    if (!res.ok) throw new Error("Consistency batch log failed");
                    return res.json();
                  })
                  .then((json) => {
                    if (json.data) {
                      useRoadmapStore.getState().setConsistencyData(json.data);
                    }
                  })
                  .catch((err) => logger.error("Debounced Consistency batch log failed", err));
              }
            }, 2000);
          }
        }
        return { success: true };
      } catch (err: any) {
        // 11. Rollback to exact pre-action snapshot
        logger.error("API update failed — rolling back", err);
        rollbackProgress(prevProgress);
        toast.error("Failed to save progress", {
          id: "task-error",
          description: "Your change was reverted.",
          action: {
            label: "Retry",
            onClick: () => handleTaskAction(taskId, action),
          },
        });

        // Rollback consistency delta
        if (consistencyDelta > 0) {
          const currentConsistency = useRoadmapStore.getState().consistencyData;
          if (currentConsistency) {
            const cached = getCachedRoadmap(currentRoadmap.roleId, userIdRef.current);
            if (cached) {
              setCachedRoadmap(currentRoadmap.roleId, cached, userIdRef.current);
            }
          }
        }
        return { success: false, error: err.message, code: "NETWORK_ERROR" };
      } finally {
        // 12. Always cleanup in-flight tracking
        removeInFlight(taskId);
      }
    },
    [performOptimisticUpdate, rollbackProgress, setRoadmapData, addInFlight, removeInFlight]
  );

  const onAction = useCallback(
    async (action: any): Promise<{ success: boolean; error?: string; code?: string }> => {
      switch (action.type) {
        case "complete":
        case "skip":
        case "uncomplete":
        case "unskip":
          return await handleTaskAction(action.taskId, action.type as TaskAction);
        case "open":
          setFocusTaskId(null);
          setSelectedTaskId(action.taskId);
          return { success: true };
        case "close-panel":
          setSelectedTaskId(null);
          return { success: true };
        case "focus":
          setSelectedTaskId(null);
          setFocusTaskId(action.taskId);
          return { success: true };
        case "exit-focus":
          setFocusTaskId(null);
          return { success: true };
        case "focus-next":
          if (derivedState.nextTaskId) setFocusTaskId(derivedState.nextTaskId);
          return { success: true };
        case "resume":
          if (derivedState.nextTaskId) setSelectedTaskId(derivedState.nextTaskId);
          return { success: true };
        case "bookmark":
        case "scroll-to-recommended":
          return { success: true };
        default:
          return { success: false, error: "Unknown action" };
      }
    },
    [handleTaskAction, setSelectedTaskId, setFocusTaskId, derivedState.nextTaskId]
  );

  const data = useMemo(() => {
    let safeSelectedTask = null;
    if (selectedTaskId) {
      const taskObj = derivedState.allTasks.find(t => t.id === selectedTaskId);
      if (taskObj) {
        safeSelectedTask = {
          ...taskObj,
          state: derivedState.taskStatesMap.get(selectedTaskId) || "locked",
          description: "", resources: [], skills: [], prerequisites: [], unlocks: [], isBookmarked: false, isRecommended: selectedTaskId === derivedState.nextTaskId
        };
      }
    }

    let safeFocusTask = null;
    if (focusTaskId) {
      const taskObj = derivedState.allTasks.find(t => t.id === focusTaskId);
      if (taskObj) {
        safeFocusTask = {
          ...taskObj,
          description: "", skills: [], unlocks: [], resources: [], nextTask: null, isRecommended: focusTaskId === derivedState.nextTaskId
        };
      }
    }

    return {
      title: roadmapData?.roleTitle || roadmapData?.role || "Learning Roadmap",
      topics,
      progress: {
        ...stats,
        remainingHours: 0,
      },
      dailyPlan: null,
      momentum: null,
      weeklySummary: null,
      streak: null,
      lastTask: null,
      selectedTask: safeSelectedTask,
      focusTask: safeFocusTask,
      recommendedTaskId: derivedState.nextTaskId,
      isUpdatingTaskIds: inFlightTasks,
      onAction,
      showConfetti: false,
      toast: null
    };
  }, [
    roadmapData?.roleTitle,
    roadmapData?.role,
    topics, 
    stats, 
    derivedState.allTasks, 
    derivedState.taskStatesMap, 
    derivedState.nextTaskId, 
    selectedTaskId, 
    focusTaskId, 
    inFlightTasks, 
    onAction
  ]);

  return {
    data,
    onAction,
    isLoading,
    isDelayedUX,
    error,
    retryGenerate: () => selectedRole && generateRoadmap(selectedRole),
  };
}
