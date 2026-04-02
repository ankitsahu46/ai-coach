"use client";

import React from "react";
import { useDashboard } from "../hooks/useDashboard";
import { EmptyState } from "./EmptyState";
import { RoadmapCard } from "./RoadmapCard";
import { StatsGrid } from "./StatsGrid";
import { ContinueLearningCard } from "./ContinueLearningCard";
import { useRole } from "@/features/role-selection";

// ============================================
// DASHBOARD CONTAINER
// ============================================
// Orchestrator component. Handles loading states, empty states,
// and layout for the dashboard widgets.
// ============================================

export function DashboardContainer() {
  const {
    hasRole,
    roadmap,
    progress,
    stats,
    nextTopic,
    isLoading,
    isEmpty,
    error
  } = useDashboard();
  
  const { selectedRole } = useRole();

  if (isLoading) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-64 bg-white/5 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-40 bg-white/5 rounded-3xl" />
          <div className="lg:col-span-1 h-64 bg-white/5 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 rounded-2xl border border-red-500/20 bg-red-500/10 text-center text-red-200">
        <h3 className="text-lg font-semibold mb-2">Error Loading Dashboard</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!hasRole) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-12">
        <EmptyState type="no-role" />
      </div>
    );
  }

  if (isEmpty || !roadmap) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-12">
        <EmptyState type="no-roadmap" roleTitle={selectedRole?.title} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-6">
      <RoadmapCard roadmap={roadmap} progress={progress} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StatsGrid stats={stats} />
        </div>
        <div className="lg:col-span-1">
          {/* We know selectedRole exists due to hasRole pass, but TS needs assertion or fallback */}
          <ContinueLearningCard roleId={selectedRole?.id || roadmap.roleId} nextTopic={nextTopic} />
        </div>
      </div>
    </div>
  );
}
