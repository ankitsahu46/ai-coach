import { useSession, signIn } from "next-auth/react";
import { useEffect, useRef } from "react";
import { useRole } from "@/features/role-selection";
import type { NormalizedRoadmap, Task, ProgressStats } from "@/features/roadmap/types";
import { useRoadmapStore, getCachedRoadmap, setCachedRoadmap } from "@/features/roadmap/store/useRoadmapStore";
import { useRoadmapStats, useGraphCache, useNextTask } from "@/features/roadmap/store/roadmapSelectors";
import { logger } from "@/lib/logger";

// ============================================
// useDashboard
// ============================================
// Reads roadmap data from the GLOBAL Zustand store.
// The Roadmap page writes to the same store, so when
// a task is toggled, the Dashboard sees it INSTANTLY.
//
// Uses selectors for derived state — no inline logic.
//
// M-01 fix: If store is empty on mount (direct navigation),
// hydrate from DB via API to prevent false empty states.
// ============================================

export interface DashboardState {
  hasRole: boolean;
  roadmap: ReturnType<typeof useRoadmapStore.getState>["roadmapData"];
  progress: number;
  stats: {
    completed: number;
    remaining: number;
    total: number;
  };
  nextTask: Task | null;
  isLoading: boolean;
  isEmpty: boolean;
  error: string | null;
}

export function useDashboard(): DashboardState {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const { selectedRole, isHydrated } = useRole();

  // Auth protection — redirect unauthenticated users to sign-in
  useEffect(() => {
    if (status === "unauthenticated") {
      signIn(undefined, { callbackUrl: "/dashboard" });
    }
  }, [status]);

  const hasRole = !!selectedRole;
  const isAuthenticated = status === "authenticated";

  // ── Read from the SAME Zustand store that the Roadmap page writes to ──
  const roadmap = useRoadmapStore((s) => s.roadmapData);
  const storeIsLoading = useRoadmapStore((s) => s.isLoading);
  const storeError = useRoadmapStore((s) => s.error);
  const setRoadmapData = useRoadmapStore((s) => s.setRoadmapData);
  const setLoading = useRoadmapStore((s) => s.setLoading);

  // ── Selectors (derived state via shared-logic) ──
  const progressStats: ProgressStats = useRoadmapStats(roadmap);
  const graphCache = useGraphCache(roadmap);
  const nextTask = useNextTask(roadmap, graphCache);

  // M-01: Hydrate store from DB on direct navigation (when store is empty)
  const hydrationAttemptedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !hasRole || !selectedRole || roadmap || storeIsLoading || hydrationAttemptedRef.current) {
      return;
    }

    hydrationAttemptedRef.current = true;

    // First, try localStorage cache for instant display
    const cached = getCachedRoadmap(selectedRole.id, userId);
    if (cached) {
      logger.info("Dashboard: Cache hit on hydration", { role: selectedRole.title });
      setRoadmapData(cached);
      return;
    }

    // Then, fetch from API (orchestration stays in hook, state in store)
    setLoading(true);
    fetch(`/api/roadmap?roleId=${encodeURIComponent(selectedRole.id)}`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((json) => {
        if (json?.data) {
          const data = json.data as NormalizedRoadmap;
          setRoadmapData(data);
          setCachedRoadmap(selectedRole.id, data, userId);
          logger.info("Dashboard: DB hydration success", { role: selectedRole.title });
        }
      })
      .catch((err) => {
        logger.warn("Dashboard: DB hydration failed", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAuthenticated, hasRole, selectedRole, roadmap, storeIsLoading, userId, setRoadmapData, setLoading]);

  // ── Loading state ──
  const isAuthLoading = status === "loading" || status === "unauthenticated";
  const isRoleLoading = !isHydrated;
  const isLoading = isAuthLoading || isRoleLoading || storeIsLoading;

  if (isAuthLoading) {
    return {
      hasRole: false,
      roadmap: null,
      progress: 0,
      stats: { completed: 0, remaining: 0, total: 0 },
      nextTask: null,
      isLoading: true,
      isEmpty: false,
      error: null,
    };
  }

  // Empty = user has a role but no roadmap data exists yet
  const isEmpty = !isLoading && hasRole && !roadmap;

  return {
    hasRole,
    roadmap: roadmap ?? null,
    progress: progressStats.percentage,
    stats: {
      completed: progressStats.completed,
      remaining: progressStats.total - progressStats.completed,
      total: progressStats.total,
    },
    nextTask,
    isLoading,
    isEmpty,
    error: storeError,
  };
}
