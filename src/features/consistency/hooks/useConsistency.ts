import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRoadmapStore } from "@/features/roadmap/store/useRoadmapStore";
import { logger } from "@/lib/logger";
import type { NormalizedConsistency } from "../types";

export function useConsistency(roleId: string | null) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const consistencyData = useRoadmapStore((s) => s.consistencyData);
  const setConsistencyData = useRoadmapStore((s) => s.setConsistencyData);

  useEffect(() => {
    if (!isAuthenticated || !roleId) return;
    
    // If we already have it in the store, don't refetch on every mount
    if (consistencyData) return;

    logger.info("Fetching consistency data into global store", { roleId });

    fetch(`/api/consistency?roleId=${encodeURIComponent(roleId)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch consistency");
        return res.json();
      })
      .then((json) => {
        if (json.data) {
          setConsistencyData(json.data as NormalizedConsistency);
        }
      })
      .catch((err) => logger.error("useConsistency fetch failed", err));
  }, [isAuthenticated, roleId, consistencyData, setConsistencyData]);

  return {
    consistency: consistencyData,
    isLoading: isAuthenticated && !consistencyData,
    error: null,
  };
}

