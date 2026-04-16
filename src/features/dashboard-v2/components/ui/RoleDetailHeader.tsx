import React from "react";
import { Code2 } from "lucide-react";
import { RoleFilterSelector } from "./RoleFilterSelector";
import type { RoleDetailViewModel } from "../../types";

export interface RoleDetailHeaderProps {
  detail: RoleDetailViewModel;
  activeFilter: string;
  onFilterSelect: (filter: string) => void;
}

export function RoleDetailHeader({ detail, activeFilter, onFilterSelect }: RoleDetailHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full mb-8 pt-8 border-t border-white/5">
      <div className="flex items-center gap-4">
        <div className="w-[52px] h-[52px] bg-[#0a0a0a] rounded-[16px] border border-white/5 shadow-inner flex items-center justify-center relative overflow-hidden flex-shrink-0">
             {/* Subtle green ambient light inside the icon box */}
             <div className="absolute inset-0 bg-gradient-to-br from-[#02b37b]/20 to-transparent opacity-30" />
            <Code2 size={24} className="text-[#02b37b] relative z-10" strokeWidth={2.5} />
        </div>
        <div className="flex flex-col justify-center">
          <h2 className="text-3xl font-extrabold text-white mb-1.5 tracking-tight">{detail.roleTitle}</h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest text-neutral-500 uppercase">
              SPECIALIST PATH
            </span>
            <span className="text-[10px] font-bold text-neutral-600">&bull;</span>
            <span className="text-[10px] font-bold tracking-widest text-[#02b37b] uppercase">
              {detail.overallPercentage}% COMPLETE
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 sm:mt-0 self-start sm:self-auto">
        <RoleFilterSelector activeFilter={activeFilter} onFilterSelect={onFilterSelect} />
      </div>
    </div>
  );
}
