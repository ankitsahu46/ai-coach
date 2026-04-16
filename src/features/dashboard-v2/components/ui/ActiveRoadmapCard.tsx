import React from "react";
import { ChevronRight } from "lucide-react";
import type { RoleProgressViewModel } from "../../types";

interface ActiveRoadmapCardProps {
  role: RoleProgressViewModel;
  onClick?: () => void;
}

export function ActiveRoadmapCard({ role, onClick }: ActiveRoadmapCardProps) {
  return (
    <div onClick={onClick} className="flex flex-col p-6 rounded-2xl bg-[#0f0f0f] border border-white/5 hover:border-white/10 transition-colors group cursor-pointer h-full">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-lg font-bold text-white leading-none">{role.title}</h3>
        <ChevronRight size={18} className="text-neutral-500 group-hover:text-white transition-colors" />
      </div>

      <div className="flex flex-col mb-8">
        <div className="flex justify-between items-center text-xs text-neutral-400 mb-2 font-medium tracking-wide">
          <span>Progress</span>
          <span className="text-[#02b37b]">{role.progressPercentage}%</span>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white transition-all duration-1000 ease-out rounded-full" 
            style={{ width: `${role.progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col mt-auto">
        <span className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase mb-2">
          NEXT TASK
        </span>
        <p className="text-sm font-medium text-neutral-300 group-hover:text-white transition-colors line-clamp-2">
          {role.nextTaskTitle || "Roadmap complete!"}
        </p>
      </div>
    </div>
  );
}
