import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import type { NormalizedTopic } from "@/features/roadmap/types";

interface ContinueLearningCardProps {
  roleId: string;
  nextTopic: NormalizedTopic | null;
}

export function ContinueLearningCard({ roleId, nextTopic }: ContinueLearningCardProps) {
  if (!nextTopic) {
    return (
      <div className="p-6 md:p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl flex flex-col items-center justify-center text-center h-full min-h-[240px]">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 mb-4">
          <BookOpen size={32} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Roadmap Complete!</h3>
        <p className="text-white/60 mb-6">You have mastered all the topics in this roadmap. Great job!</p>
        <Link
          href={`/roadmap/${roleId}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
        >
          Review Roadmap
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl flex flex-col h-full min-h-[240px] relative overflow-hidden group">
      {/* Decorative gradient orb */}
      <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none transition-opacity duration-500 group-hover:bg-blue-500/20" />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-white/60 text-sm font-medium uppercase tracking-wider mb-4">
          <BookOpen size={16} />
          <span>Up Next</span>
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-3 line-clamp-2">
          {nextTopic.title}
        </h3>
        
        <p className="text-white/60 mb-8 line-clamp-3 flex-1">
          {nextTopic.description}
        </p>

        <Link
          href={`/roadmap/${roleId}?resume=true`}
          className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-transform active:scale-[0.98]"
        >
          <span>Continue Learning</span>
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
