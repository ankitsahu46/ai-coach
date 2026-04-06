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
    
    const fetchFreshData = () => {
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
    };

    // Initial load
    if (!consistencyData) fetchFreshData();

    // Cross-tab Synchronization (Instant)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "consistency_updated") {
        fetchFreshData();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [isAuthenticated, roleId, consistencyData /* We might omit consistencyData from deps to avoid re-binding, but it's safe due to React closure semantics if fetchFreshData doesn't close over it stalely */, setConsistencyData]);

  return {
    consistency: consistencyData,
    isLoading: isAuthenticated && !consistencyData,
    error: null,
  };
}

