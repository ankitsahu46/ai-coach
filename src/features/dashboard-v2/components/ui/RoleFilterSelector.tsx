import React from "react";
import { Plus } from "lucide-react";

export interface RoleFilterSelectorProps {
  activeFilter: string;
  onFilterSelect: (filter: string) => void;
}

export function RoleFilterSelector({ activeFilter, onFilterSelect }: RoleFilterSelectorProps) {
  const filters = ["All", "Frontend", "Backend", "Devops"];

  return (
    <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#141414] rounded-[24px] border border-white/5">
      {filters.map((filter) => {
        const isActive = activeFilter.toLowerCase() === filter.toLowerCase();
        return (
          <button
            key={filter}
            onClick={() => onFilterSelect(filter)}
            className={`px-5 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all duration-300 ${
              isActive
                ? "bg-white/10 text-white border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                : "bg-transparent text-neutral-500 hover:text-white border border-transparent"
            }`}
          >
            {filter}
          </button>
        );
      })}
      <div className="w-[1px] h-4 bg-white/10 mx-1" />
      <button className="px-4 py-2 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-2 text-neutral-500 hover:text-white transition-colors">
        <Plus size={12} strokeWidth={3} />
        ADD
      </button>
    </div>
  );
}
