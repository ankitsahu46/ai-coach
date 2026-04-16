import React from "react";
import { CheckCircle2, Target } from "lucide-react";
import type { BestNextStepViewModel } from "../../types";

interface BestNextStepCardProps {
  step: BestNextStepViewModel | null;
}

export function BestNextStepCard({ step }: BestNextStepCardProps) {
  if (!step) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-[#0f0f0f] border border-white/5 h-full min-h-[240px]">
        <p className="text-neutral-500 text-sm">No tasks available</p>
      </div>
    );
  }

  return (
    <div className="group flex flex-col p-5 rounded-2xl bg-[#0f0f0f] border border-[#02b37b]/30 shadow-[0_0_20px_rgba(2,179,123,0.1)] hover:shadow-[0_0_30px_rgba(2,179,123,0.2)] hover:border-[#02b37b]/60 transition-all duration-300 h-full relative overflow-hidden transform hover:-translate-y-1">
      {/* Subtle green ambient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#02b37b]/0 via-[#02b37b]/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#02b37b]" />
        <span className="text-[9px] font-bold tracking-[0.15em] text-[#02b37b] uppercase">
          RECOMMENDED
        </span>
      </div>

      <h3 className="text-[13px] font-bold text-white leading-tight mb-2 line-clamp-2">
        {step.taskTitle}
      </h3>

      <p className="text-[10px] text-neutral-400 italic mb-4 flex-1 line-clamp-3">
        {step.reasonText}
      </p>

      <div className="flex items-center gap-2 mb-4">
        <Target size={12} className="text-[#02b37b]" />
        <span className="text-[9px] font-bold tracking-[0.15em] text-[#02b37b] uppercase">
          {step.roleTitle}
        </span>
      </div>

      <button className="w-full bg-[#02b37b] hover:bg-[#029b6a] text-[#0f0f0f] py-2 rounded-[10px] text-[9px] font-bold tracking-widest transition-colors focus:ring-2 focus:ring-[#02b37b]/40 outline-none flex items-center justify-center gap-2">
        CONTINUE &gt;
      </button>
    </div>
  );
}
