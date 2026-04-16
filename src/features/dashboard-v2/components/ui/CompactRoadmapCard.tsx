import React from "react";
import { ChevronRight, Database, Code2, Cloud } from "lucide-react";
import type { RoleProgressViewModel } from "../../types";

interface CompactRoadmapCardProps {
  role: RoleProgressViewModel;
  onClick?: () => void;
}

export function CompactRoadmapCard({ role, onClick }: CompactRoadmapCardProps) {
  // Simple heuristic icon mapping based on mock titles to match screenshot visually
  const renderIcon = () => {
    if (role.title.toLowerCase().includes("backend")) return <Database size={16} className="text-neutral-400" />;
    if (role.title.toLowerCase().includes("devops")) return <Cloud size={16} className="text-neutral-400" />;
    return <Code2 size={16} className="text-neutral-400" />;
  };

  return (
    <div onClick={onClick} className="flex items-center justify-between p-4 rounded-xl bg-[#0a0a0a] border border-white/5 hover:border-white/10 transition-colors group cursor-pointer w-full">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-[#1c1c1c] border border-white/5 flex items-center justify-center">
          {renderIcon()}
        </div>
        <div className="flex flex-col">
          <h4 className="text-sm font-bold text-white leading-tight">{role.title}</h4>
          <span className="text-xs text-neutral-500">{role.progressPercentage}% complete</span>
        </div>
      </div>
      <ChevronRight size={16} className="text-neutral-600 group-hover:text-white transition-colors" />
    </div>
  );
}
