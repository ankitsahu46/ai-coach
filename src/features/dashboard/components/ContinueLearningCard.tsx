import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import type { Task } from "@/features/roadmap/types";

interface ContinueLearningCardProps {
  roleId: string;
  nextTask: Task | null;
}

export function ContinueLearningCard({ roleId, nextTask }: ContinueLearningCardProps) {
  if (!nextTask) {
    return (
      <div className="p-6 md:p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl flex flex-col items-center justify-center text-center h-full min-h-[240px]">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 mb-4">
          <BookOpen size={32} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Roadmap Complete!</h3>
        <p className="text-white/60 mb-6">You have mastered all the tasks in this roadmap. Great job!</p>
        <Link
          href="/roadmap"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
        >
          Review Roadmap
        </Link>
      </div>
    );
  }

  // Map task type to a display label
  const typeLabel: Record<string, string> = {
    learn: "Learn",
    practice: "Practice",
    project: "Project",
  };

  return (
    <div className="p-6 md:p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl flex flex-col h-full min-h-[240px] relative overflow-hidden group">
      {/* Decorative gradient orb */}
      <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none transition-opacity duration-500 group-hover:bg-blue-500/20" />

      <div className="relative z-10 flex-1 flex flex-col">
        <div className="flex items-center gap-2 text-white/60 text-sm font-medium uppercase tracking-wider mb-4">
          <BookOpen size={16} />
          <span>Up Next</span>
          <span className="ml-auto text-xs font-normal capitalize px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
            {typeLabel[nextTask.type] ?? nextTask.type}
          </span>
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-3 line-clamp-2">
          {nextTask.title}
        </h3>
        
        <div className="flex items-center gap-3 text-white/40 text-sm mb-8 flex-1">
          <span>⏱ {nextTask.estimatedTime}</span>
          {nextTask.isOptional && (
            <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
              Optional
            </span>
          )}
        </div>

        <Link
          href={`/roadmap#task-${nextTask.id}`}
          className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-transform active:scale-[0.98]"
        >
          <span>Continue Learning</span>
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
