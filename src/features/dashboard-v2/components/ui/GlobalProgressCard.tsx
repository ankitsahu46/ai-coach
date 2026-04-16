import React from "react";
import type { GlobalProgressViewModel } from "../../types";

interface GlobalProgressCardProps {
  progress: GlobalProgressViewModel;
}

export function GlobalProgressCard({ progress }: GlobalProgressCardProps) {
  return (
    <div className="flex flex-col p-5 rounded-2xl bg-[#0f0f0f] border border-white/5 h-full">
      <div className="flex flex-col mb-4">
        <span className="text-[9px] font-bold tracking-[0.15em] text-neutral-500 uppercase mb-1">
          PROGRESS
        </span>
        <span className="text-3xl font-bold text-white leading-none">
          {progress.percentage}%
        </span>
      </div>

      <div className="w-full h-1 bg-white/5 rounded-full mb-5 overflow-hidden">
        <div 
          className="h-full bg-white transition-all duration-1000 ease-out rounded-full" 
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      <div className="flex flex-col gap-3 mt-auto">
        {progress.roles.map((role, idx) => (
          <div key={idx} className="flex justify-between items-center text-[10px]">
            <span className="text-neutral-400">{role.title}</span>
            <span className="text-neutral-200 font-bold">{role.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
