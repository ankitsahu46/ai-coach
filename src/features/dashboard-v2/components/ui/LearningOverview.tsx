import React from "react";
import { LayoutGrid } from "lucide-react";
import { RoleFilterSelector } from "./RoleFilterSelector";

export interface LearningOverviewProps {
  activeFilter: string;
  onFilterSelect: (filter: string) => void;
}

export function LearningOverview({ activeFilter, onFilterSelect }: LearningOverviewProps) {
  const filters = ["All", "Frontend", "Backend", "Devops"];

  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between w-full mb-8 pt-8 border-t border-white/5">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-[#1c1c1c] rounded-xl border border-white/5">
          <LayoutGrid size={24} className="text-neutral-300" />
        </div>
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-white mb-1">Active Roadmaps</h2>
          <p className="text-neutral-500 text-sm flex items-center gap-1">
            <span className="w-4 h-4 rounded-full border border-neutral-600 inline-flex items-center justify-center text-[10px]">&copy;</span>
            Multi-Role Journey
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mt-0">
        <RoleFilterSelector activeFilter={activeFilter} onFilterSelect={onFilterSelect} />
      </div>
    </div>
  );
}
