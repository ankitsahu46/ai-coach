import { useSession, signIn } from "next-auth/react";
import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { useRole } from "@/features/role-selection";
import type { NormalizedRoadmap, NormalizedTopic } from "@/features/roadmap/types";
import { logger } from "@/features/roadmap/utils/logger";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (res.status === 404) {
    const error = new Error("Not Found");
    (error as any).status = 404;
    throw error;
  }
  if (!res.ok) throw new Error("Failed to fetch roadmap");
  const data = await res.json();
  return data.data;
};

export interface DashboardState {
  hasRole: boolean;
  roadmap: NormalizedRoadmap | null;
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
  const { data: session, status } = useSession();
  const { selectedRole, isHydrated } = useRole();

  // Auth Protection Boundary - Block execution while loading
  // SWR won't fetch because shouldFetch evaluates safely
  useEffect(() => {
    if (status === "unauthenticated") {
      signIn(undefined, { callbackUrl: "/dashboard" });
    }
  }, [status]);

  const hasRole = !!selectedRole;

  // Data fetching via SWR
  // Prevent double fetch by strongly gating execution
  const shouldFetch = status === "authenticated" && selectedRole?.id;
  const swrKey = shouldFetch ? `/api/roadmap?roleId=${selectedRole.id}` : null;
  const {
    data: roadmap,
    error: fetchError,
    isLoading: swrIsLoading,
    isValidating
  } = useSWR<NormalizedRoadmap>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: true,
      errorRetryCount: 2,
      onSuccess: () => logger.info("Dashboard SWR: Data successfully synchronized")
    }
  );

  // Derived State Memoization
  const { progress, stats, nextTopic } = useMemo(() => {
    if (!roadmap || !roadmap.topics || roadmap.topics.length === 0) {
      return {
        progress: 0,
        stats: { completed: 0, remaining: 0, total: 0 },
        nextTopic: null,
      };
    }

    const total = roadmap.topics.length;
    // O(1) lookup via Set optimization (scalable pattern)
    const completedTopicIds = new Set<string>();
    
    for (const topic of roadmap.topics) {
      if (topic.completed) {
        completedTopicIds.add(topic.id);
      }
    }

    const completed = completedTopicIds.size;
    const next = roadmap.topics.find((t) => !completedTopicIds.has(t.id)) || null;

    return {
      progress: Math.round((completed / total) * 100),
      stats: {
        completed,
        remaining: total - completed,
        total,
      },
      nextTopic: next,
    };
  }, [roadmap]);

  // Handle Loading - Immediate unified evaluation without flicker
  const isAuthLoading = status === "loading";
  const isRoleLoading = !isHydrated;
  const isLoading = isAuthLoading || isRoleLoading || swrIsLoading || (isValidating && !roadmap && !fetchError);

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

  const error = fetchError ? fetchError.message : null;
  
  // Empty state explicitly handles the case where the user has a role, fetch finishes, but receives zero docs (usually 404 sets error, but just in case)
  // But wait, the API returns 404 for no roadmap, which SWR interprets as an error. 
  // Let's ensure a 404 is specifically treated as 'isEmpty'
  const isSWR404 = fetchError && (fetchError as any).status === 404;
  const isEmpty = !isLoading && hasRole && (!roadmap && !!isSWR404);

  return {
    hasRole,
    roadmap,
    progress,
    stats,
    nextTopic,
    isLoading,
    isEmpty,
    error: isSWR404 ? null : error, // suppress error if it's just 'not found'
  };
}
