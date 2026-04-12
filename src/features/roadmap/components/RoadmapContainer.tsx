"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRoadmapGeneration } from "../hooks/useRoadmapGeneration";
import { RoadmapPage } from "./roadmap-ui/components/RoadmapPage";
import { useRole } from "@/features/role-selection";

// ============================================
// ROADMAP CONTAINER — Data Connector
// ============================================
// Bridges the headless UI module with the orchestrator hook.
// Responsibilities:
//   1. Hydration safety (mounted guard)
//   2. Loading / error / empty fallback states
//   3. CSS scope boundary (.roadmap-ui wrapper)
//   4. Navigation controls (Change Role)
//   5. Passes data + onAction to pure UI
// ============================================

export function RoadmapContainer() {
  // ── Hydration guard ──
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const router = useRouter();
  const { selectedRole, clearRole } = useRole();
  const { data, onAction, isLoading, error } = useRoadmapGeneration(selectedRole);

  // Don't render anything until hydrated — avoids Next.js mismatch warnings
  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-6 py-8 space-y-4 animate-pulse">
        <div className="h-20 bg-white/5 rounded-xl" />
        <div className="h-16 bg-white/5 rounded-xl" />
        <div className="space-y-3 pl-10">
          <div className="h-14 bg-white/5 rounded-xl" />
          <div className="h-14 bg-white/5 rounded-xl" />
          <div className="h-14 bg-white/5 rounded-xl" />
          <div className="h-14 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 mt-12 rounded-2xl border border-red-500/20 bg-red-500/10 text-center">
        <h3 className="text-lg font-semibold text-red-200 mb-2">Error Loading Roadmap</h3>
        <p className="text-sm text-red-300/80">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full max-w-2xl mx-auto p-6 mt-12 rounded-2xl border border-zinc-700/30 bg-zinc-800/30 text-center">
        <h3 className="text-lg font-semibold text-zinc-300 mb-2">No Roadmap Available</h3>
        <p className="text-sm text-zinc-500">Select a role to generate your personalized learning roadmap.</p>
      </div>
    );
  }

  const handleChangeRole = () => {
    clearRole();
    router.push("/");
  };

  return (
    <div className="roadmap-ui">
      {/* Navigation — outside UI module boundary */}
      <div className="max-w-4xl mx-auto px-6 pt-6 pb-0">
        <button
          onClick={handleChangeRole}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/30 transition-all cursor-pointer"
          aria-label="Change career role"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Change Role
        </button>
      </div>
      <RoadmapPage {...data} onAction={onAction} />
    </div>
  );
}
