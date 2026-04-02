import type { NormalizedRoadmap } from "@/features/roadmap/types";
import { ProgressBar } from "./ProgressBar";

interface RoadmapCardProps {
  roadmap: NormalizedRoadmap;
  progress: number;
}

export function RoadmapCard({ roadmap, progress }: RoadmapCardProps) {
  return (
    <div className="p-8 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-xl relative overflow-hidden">
      {/* Decorative gradient orb */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase mb-4">
          Current Goal
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
          {roadmap.roleTitle || roadmap.role}
        </h2>
        
        <p className="text-white/60 mb-8 max-w-lg">
          Master the essential skills and tools required to become a proficient {roadmap.roleTitle || roadmap.role}.
        </p>

        <ProgressBar progress={progress} />
      </div>
    </div>
  );
}
