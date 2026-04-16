"use client";

import React from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useDashboardV2ViewModel } from "../../hooks/useDashboardV2ViewModel";

// UI Components
import { DashboardHeader } from "../ui/DashboardHeader";
import { StreakCard } from "../ui/StreakCard";
import { GlobalProgressCard } from "../ui/GlobalProgressCard";
import { BestNextStepCard } from "../ui/BestNextStepCard";
import { SkillRadarCard } from "../ui/SkillRadarCard";
import { ConsistencyHeatmapCard } from "../ui/ConsistencyHeatmapCard";
import { LearningOverview } from "../ui/LearningOverview";
import { ActiveRoadmapCard } from "../ui/ActiveRoadmapCard";
import { CompactRoadmapCard } from "../ui/CompactRoadmapCard";
import { RoleDetailHeader } from "../ui/RoleDetailHeader";
import { SkillBreakdownCard } from "../ui/SkillBreakdownCard";
import { FocusedNextStepCard } from "../ui/FocusedNextStepCard";

export function DashboardV2Container() {
  const model = useDashboardV2ViewModel();

  if (model.isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-6 animate-pulse px-8 lg:px-16 pt-8 pb-16">
        <div className="h-20 bg-white/5 rounded-2xl w-1/3 mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="h-64 bg-white/5 rounded-2xl" />
          <div className="h-64 bg-white/5 rounded-2xl" />
          <div className="h-64 bg-white/5 rounded-2xl" />
          <div className="h-64 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Strictly maps to screenshots visually, ignoring standard empty states 
  // since this is an experimental view showcasing the future UX.
  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col px-8 lg:px-16 pt-8 pb-24">
      <DashboardHeader userName={model.userName} />

      {/* Top Section: Metrics + Heatmap + Radar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-12">
        {/* Left Column (takes ~66% width) */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          {/* Top 3 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StreakCard streak={model.streak} />
            <GlobalProgressCard progress={model.globalProgress} />
            <BestNextStepCard step={model.bestNextStep} />
          </div>
          {/* Bottom Card: Activity Heatmap */}
          <ConsistencyHeatmapCard heatmap={model.heatmap} />
        </div>

        {/* Right Column (takes ~33% width, full height) */}
        <div className="xl:col-span-1">
          <SkillRadarCard radar={model.radar} />
        </div>
      </div>

      {/* Dynamic Conditional Rendering for Role Tracking */}
      <div className="relative w-full">
        <AnimatePresence mode="wait">
          {model.activeFilter === "All" ? (
            <motion.div 
              key="all-overview" 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
              transition={{ duration: 0.4 }}
              className="flex flex-col"
            >
              {/* Row 3: Roles Section Header */}
              <LearningOverview 
                activeFilter={model.activeFilter} 
                onFilterSelect={model.setActiveFilter} 
              />

              {/* Row 4: Active Roadmaps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {model.activeRoles.map((role) => (
                  <div key={role.id}>
                    <ActiveRoadmapCard 
                      role={role} 
                      onClick={() => model.setActiveFilter(role.title.split(' ')[0])}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="specific-role"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col"
            >
              {model.activeRoleDetail && (
                <>
                  <RoleDetailHeader 
                    detail={model.activeRoleDetail} 
                    activeFilter={model.activeFilter} 
                    onFilterSelect={model.setActiveFilter} 
                  />
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <SkillBreakdownCard skills={model.activeRoleDetail.skills} roleTitle={model.activeRoleDetail.roleTitle} />
                    </div>
                    <div className="lg:col-span-1">
                      <FocusedNextStepCard step={model.activeRoleDetail.focusedNextStep} roleTitle={model.activeRoleDetail.roleTitle} />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Row 5: ALWAYS VISIBLE - Other Active Roadmaps (Compact) */}
      <div className="flex flex-col mt-6">
        <h3 className="text-[11px] font-bold tracking-widest text-neutral-500 uppercase mb-4">
          OTHER ACTIVE ROADMAPS
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {model.otherRoles.map((role) => (
            <div key={role.id}>
              <CompactRoadmapCard 
                role={role} 
                onClick={() => model.setActiveFilter(role.title.split(' ')[0])}
              />
            </div>
          ))}
          
          {/* Explore More Card */}
          <button className="flex items-center justify-center p-4 rounded-[20px] border border-dashed border-white/10 hover:border-white/30 text-neutral-500 hover:text-white transition-colors h-[74px]">
            <Plus size={16} className="mr-2" />
            <span className="text-sm font-medium">Explore More</span>
          </button>
        </div>
      </div>
    </div>
  );
}
