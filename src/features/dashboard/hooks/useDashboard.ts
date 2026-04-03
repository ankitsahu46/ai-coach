import { useSession, signIn } from "next-auth/react";
import { useEffect, useMemo } from "react";
import { useRole } from "@/features/role-selection";
import type { NormalizedTopic } from "@/features/roadmap/types";
import { useRoadmapStore } from "@/features/roadmap/store/useRoadmapStore";

// ============================================
// useDashboard
// ============================================
// Reads roadmap data from the GLOBAL Zustand store.
// The Roadmap page writes to the same store, so when
// a topic is toggled, the Dashboard sees it INSTANTLY.
//
// No more disconnected SWR fetch — single source of truth.
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
  nextTopic: NormalizedTopic | null;
  isLoading: boolean;
  isEmpty: boolean;
  error: string | null;
}

export function useDashboard(): DashboardState {
  const { status } = useSession();
  const { selectedRole, isHydrated } = useRole();

  // Auth protection — redirect unauthenticated users to sign-in
  useEffect(() => {
    if (status === "unauthenticated") {
      signIn(undefined, { callbackUrl: "/dashboard" });
    }
  }, [status]);

  const hasRole = !!selectedRole;

  // ── Read from the SAME Zustand store that the Roadmap page writes to ──
  const roadmap = useRoadmapStore((s) => s.roadmapData);
  const storeIsLoading = useRoadmapStore((s) => s.isLoading);
  const storeError = useRoadmapStore((s) => s.error);

  // ── Derived stats (memoized) ──
  const { progress, stats, nextTopic } = useMemo(() => {
    if (!roadmap || !roadmap.topics || roadmap.topics.length === 0) {
      return {
        progress: 0,
        stats: { completed: 0, remaining: 0, total: 0 },
        nextTopic: null,
      };
    }

    const total = roadmap.topics.length;
    let completed = 0;
    let firstIncomplete: NormalizedTopic | null = null;

    for (const topic of roadmap.topics) {
      if (topic.completed) {
        completed++;
      } else if (!firstIncomplete) {
        firstIncomplete = topic;
      }
    }

    return {
      progress: Math.round((completed / total) * 100),
      stats: { completed, remaining: total - completed, total },
      nextTopic: firstIncomplete,
    };
  }, [roadmap]);

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
      nextTopic: null,
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
    progress,
    stats,
    nextTopic,
    isLoading,
    isEmpty,
    error: storeError,
  };
}
