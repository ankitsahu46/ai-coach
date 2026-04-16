import React, { useEffect, useState } from "react";
import type { SkillBreakdown } from "../../types";

export interface SkillBreakdownCardProps {
  skills: SkillBreakdown[];
  roleTitle: string;
}

export function SkillBreakdownCard({ skills, roleTitle }: SkillBreakdownCardProps) {
  const [mounted, setMounted] = useState(false);
  const weakestSkill = skills.find(s => s.isWeakest);

  useEffect(() => {
    // Slight delay for smooth visual flow when component enters
    const timer = setTimeout(() => setMounted(true), 150);
    return () => clearTimeout(timer);
  }, []);

  if (!skills || skills.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center p-6 rounded-[20px] bg-[#0f0f0f] border border-white/5 h-full">
        <h3 className="text-xl mx-auto text-white font-bold mb-2">Start your {roleTitle} journey 🚀</h3>
        <p className="text-neutral-500 text-sm">Complete your first task to unlock specific skill insights.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 rounded-[20px] bg-[#0f0f0f] border border-white/5 h-full relative overflow-hidden group">
      <h3 className="text-xs font-bold tracking-widest text-neutral-500 uppercase mb-6">SKILL BREAKDOWN</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        {skills.map((skill, i) => (
          <div key={i} className="flex flex-col gap-3 group/skill relative z-10 cursor-default">
            {/* Hover overlay hint */}
            <div className="flex justify-between items-end">
              <span className={`text-sm font-medium transition-colors duration-300 ${skill.isWeakest ? 'text-white' : 'text-neutral-400 group-hover/skill:text-white'}`}>
                {skill.name}
              </span>
              <span className={`text-sm font-bold transition-colors duration-300 ${skill.isWeakest ? 'text-white' : 'text-neutral-500 group-hover/skill:text-white'}`}>
                {skill.percentage}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden relative">
              <div 
                className={`h-full rounded-full transition-all duration-[1200ms] ease-out flex group-hover/skill:shadow-[0_0_10px_rgba(255,255,255,0.5)] ${skill.isWeakest ? 'bg-[#ff5c00]' : 'bg-white'}`}
                style={{ width: mounted ? `${skill.percentage}%` : '0%' }}
              />
            </div>
          </div>
        ))}
      </div>

      {weakestSkill && (
        <div className="mt-8">
          <div className="bg-[#ff5c00]/5 border border-[#ff5c00]/20 rounded-xl p-3 flex items-center gap-3 transition-all duration-300 hover:bg-[#ff5c00]/10 hover:border-[#ff5c00]/30 transform hover:-translate-y-0.5">
            <span className="text-lg">⚠️</span>
            <p className="text-sm text-[#ff5c00]/90 font-medium tracking-wide">
              <strong className="text-[#ff5c00]">{weakestSkill.name}</strong> is your weakest skill — focus here.
            </p>
          </div>
        </div>
      )}
      
      {/* Background radial gradient to give depth */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 blur-[80px] rounded-full -mr-40 -mt-40 pointer-events-none transition-opacity duration-700 opacity-30 group-hover:opacity-70" />
    </div>
  );
}
