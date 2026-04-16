import React from "react";
import { Pin } from "lucide-react";
import type { FocusedNextStep } from "../../types";

export interface FocusedNextStepCardProps {
  step: FocusedNextStep | null;
  roleTitle: string;
}

export function FocusedNextStepCard({ step, roleTitle }: FocusedNextStepCardProps) {
  if (!step) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-[20px] bg-[#0f0f0f] border border-[#02b37b]/20 h-full">
        <p className="text-neutral-300 text-base font-bold mb-2">Start your {roleTitle} journey 🚀</p>
        <p className="text-neutral-500 text-sm">Select your first task in the roadmap to begin.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 rounded-[20px] bg-[#0f0f0f] border border-[#02b37b]/30 shadow-[0_0_20px_rgba(2,179,123,0.05)] h-full relative overflow-hidden group">
      <div className="flex items-center gap-2 mb-8">
        <Pin size={14} className="text-[#ff5c00] fill-current transform rotate-45" />
        <h3 className="text-xs font-bold tracking-widest text-[#02b37b] uppercase">NEXT STEP</h3>
      </div>
      
      <div className="flex flex-col bg-white/[0.02] border border-white/5 rounded-xl p-5 group-hover:border-white/10 transition-colors">
        <div className="flex items-start gap-4">
          <div className="w-4 h-4 rounded-full border border-neutral-600 mt-1 flex-shrink-0" />
          <div className="flex flex-col">
            <h4 className="text-base font-bold text-white mb-2 leading-snug">{step.taskTitle}</h4>
            <span className="text-xs font-medium text-neutral-500">{step.duration} &bull; {step.difficulty}</span>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 w-full">
        <button className="w-full bg-[#1c1c1c] hover:bg-[#2a2a2a] border border-white/10 text-white py-4 rounded-xl text-xs font-bold tracking-widest uppercase transition-all hover:border-[#02b37b]/40 hover:shadow-[0_0_20px_rgba(2,179,123,0.1)] outline-none">
          START LEARNING
        </button>  
      </div>

      {/* Subtle green ambient light behind the card */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#02b37b] to-transparent opacity-20" />
      {/* Left side edge glow imitating screenshot 4 */}
      <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-[#02b37b]/50 to-transparent opacity-20" />
    </div>
  );
}
