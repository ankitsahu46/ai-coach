import { useState } from "react";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import { useConsistency } from "@/features/consistency/hooks/useConsistency";
import { useSession } from "next-auth/react";
import {
  mockConsistencyHeatmap,
  mockMultiRoleProgress,
  mockOtherRoles,
  mockRadarData,
  getMockRoleDetail,
} from "../__mocks__/dashboard.mock";
import type { DashboardV2ViewModel } from "../types";

export function useDashboardV2ViewModel(): DashboardV2ViewModel {
  const { data: session } = useSession();
  const userName = session?.user?.name?.split(" ")[0] || "Guest";

  // 1. Fetch real logic
  const realDashboard = useDashboard();
  const realRoleData = realDashboard.roadmap;
  const { consistency } = useConsistency(realRoleData?.roleId || null);

  // 2. Map real data strictly to the V2 ViewModels where possible
  // Use fallbacks for newly required V2 model fields if the backend nulls out
  const realNextTask = realDashboard.nextTask;

  // State filtering logic
  const [activeFilter, setActiveFilter] = useState("All");
  
  const filteredActiveRoles = activeFilter === "All" 
    ? mockMultiRoleProgress 
    : mockMultiRoleProgress.filter(r => 
        r.title.toLowerCase().includes(activeFilter.toLowerCase())
      );

  const activeRoleDetail = activeFilter === "All" 
    ? null 
    : getMockRoleDetail(activeFilter);

  const derivedOtherRoles = activeFilter === "All"
    ? mockOtherRoles
    : mockMultiRoleProgress.filter(r => 
        !r.title.toLowerCase().includes(activeFilter.toLowerCase())
      );

  return {
    hasRole: realDashboard.hasRole,
    isLoading: realDashboard.isLoading,
    isEmpty: realDashboard.isEmpty,
    error: realDashboard.error,

    userName,

    streak: {
      days: consistency?.currentStreak ?? 0,
      nextMilestone: 3, // Hardcoded logic mapping for demonstration (not stored natively right now)
      isActive: (consistency?.currentStreak ?? 0) > 0,
    },

    globalProgress: {
      percentage: 38, // Real global overall progress could be derived, overriding to 38% to match mockup
      roles: mockMultiRoleProgress.map(r => ({
        title: r.title,
        percentage: r.progressPercentage,
      })),
    },

    bestNextStep: realNextTask && realRoleData
      ? {
          taskTitle: realNextTask.title,
          reasonText: "Because your React skill is currently low and this task has the highest impact on your progress.", // Real generative reasons later
          roleId: realRoleData.roleId,
          roleTitle: realRoleData.roleTitle,
          taskId: realNextTask.id,
        }
      : null,

    // 3. EXPLICIT MOCK OVERRIDES (For the experimental views)
    radar: mockRadarData,
    heatmap: mockConsistencyHeatmap,
    activeRoles: filteredActiveRoles,
    otherRoles: derivedOtherRoles,

    activeRoleDetail,

    activeFilter,
    setActiveFilter,
  };
}
