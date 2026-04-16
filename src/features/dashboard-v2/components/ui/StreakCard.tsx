import React from "react";
import { Flame, Zap } from "lucide-react";
import type { StreakViewModel } from "../../types";

interface StreakCardProps {
  streak: StreakViewModel;
}

export function StreakCard({ streak }: StreakCardProps) {
  const isEmpty = streak.days === 0;

  return (
    <div className="flex flex-col justify-between p-5 rounded-2xl bg-[#0f0f0f] border border-white/5 h-full">
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold tracking-[0.15em] text-neutral-500 uppercase mb-1">
            STREAK
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`font-bold text-white leading-none ${isEmpty ? 'text-lg' : 'text-3xl'}`}>
              {isEmpty ? "Start your streak today 🚀" : streak.days}
            </span>
            {!isEmpty && (
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-1.5">
                DAYS
              </span>
            )}
          </div>
        </div>
        <div className={`rounded-full p-3 ${isEmpty ? 'bg-white/5 opacity-50' : 'text-[#ff5c00] opacity-80 backdrop-blur-md bg-[#ff5c00]/10'}`}>
          <Flame size={32} className={isEmpty ? "text-neutral-600" : ""} />
        </div>
      </div>
      
      <div className={`flex items-center gap-2 mt-4 text-[10px] font-medium opacity-90 ${isEmpty ? 'text-neutral-400' : 'text-[#ff5c00]'}`}>
        <Zap size={12} className={`fill-current ${isEmpty ? "text-neutral-500" : ""}`} />
        {isEmpty ? "Complete your task to begin" : `${streak.nextMilestone} days to milestone`}
      </div>
    </div>
  );
}
