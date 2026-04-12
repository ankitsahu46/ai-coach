/**
 * TopicAccordion — Topic card with journey connector, narrative, expand/collapse.
 * Local state: none (isExpanded controlled by parent via props).
 * All stats/narrative are pre-computed in the TopicView ViewModel.
 */

import type { TopicView, OnAction } from "../types";
import { ChevronIcon } from "./Icons";
import { ProgressRing } from "./ProgressRing";
import { SubtopicSection } from "./SubtopicSection";

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: "text-emerald-400/70 bg-emerald-500/5 border-emerald-500/10",
  Intermediate: "text-amber-400/70 bg-amber-500/5 border-amber-500/10",
  Advanced: "text-rose-400/70 bg-rose-500/5 border-rose-500/10",
};

export function TopicAccordion({ topic, isExpanded, onToggle, isLast, onAction, isUpdatingTaskIds, recommendedTaskId }: {
  key?: string;
  topic: TopicView;
  isExpanded: boolean;
  onToggle: () => void;
  isLast: boolean;
  onAction: OnAction;
  isUpdatingTaskIds?: Set<string>;
  recommendedTaskId?: string | null;
}) {
  const isCompleted = topic.progress === 100;
  // CURRENT badge: only for the topic that contains the recommended task
  const hasRecommendedTask = recommendedTaskId
    ? topic.subtopics.some(sub => sub.tasks.some(t => t.id === recommendedTaskId))
    : false;
  const isActive = hasRecommendedTask || (topic.isActive && !recommendedTaskId);
  const isFullyLocked = topic.isLocked;

  const nodeClasses = isCompleted
    ? "bg-emerald-500/20 border-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.2)]"
    : isActive
    ? "bg-blue-500/20 border-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.2)]"
    : "bg-zinc-800 border-zinc-600";

  const lineColor = isCompleted
    ? "rgba(34,197,94,0.3)"
    : isActive
    ? "rgba(59,130,246,0.2)"
    : "#3f3f46";

  const cardStateClass = isCompleted
    ? "topic-card-completed"
    : isActive
    ? "topic-card-active"
    : isFullyLocked
    ? "topic-card-locked"
    : "";

  return (
    <div className="relative">
      <div className="absolute -left-[29px] top-6 z-10 flex items-center justify-center">
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${nodeClasses}`}>
          {isCompleted && (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6.5L5 9L9.5 3.5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {isActive && <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
        </div>
      </div>

      {!isLast && (
        <div className="absolute -left-[21px] top-11 bottom-0 w-[2px]"
          style={{ backgroundImage: `repeating-linear-gradient(to bottom, ${lineColor} 0px, ${lineColor} 5px, transparent 5px, transparent 11px)` }} />
      )}

      <div className={`rounded-xl border transition-all duration-300 ${cardStateClass} ${
        isExpanded
          ? `border-[var(--color-border-medium)] bg-[var(--color-bg-card)]/80 shadow-md shadow-black/15 ${isCompleted ? "border-emerald-500/15" : isActive ? "border-blue-500/15" : ""}`
          : `border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-medium)] ${isCompleted ? "border-emerald-500/8" : isActive ? "border-blue-500/10" : ""}`
      }`}>
        <button onClick={onToggle} className="w-full flex items-center gap-4 p-4 text-left cursor-pointer group" aria-expanded={isExpanded}>
          <ProgressRing progress={topic.progress} size={48} strokeWidth={3.5} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`text-[15px] font-semibold truncate group-hover:text-white transition-colors ${isFullyLocked ? "text-zinc-400" : "text-zinc-100"}`}>
                {topic.title}
              </h3>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${DIFFICULTY_COLORS[topic.difficulty] || ""}`}>
                {topic.difficulty}
              </span>
              {isActive && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/8 text-blue-400/80 border border-blue-500/10 uppercase tracking-wider">
                  Current
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span>{topic.totalTasks} tasks</span>
              <span className="text-zinc-700">·</span>
              <span>{topic.completedTasks} done</span>
              {topic.availableTasks > 0 && (
                <>
                  <span className="text-zinc-700">·</span>
                  <span className="text-blue-400/70">{topic.availableTasks} ready</span>
                </>
              )}
            </div>
            {topic.narrative && !isFullyLocked && (
              <p className="text-[11px] text-zinc-500/80 mt-1 italic">{topic.narrative}</p>
            )}
            <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={topic.progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full transition-all duration-700 ease-out progress-bar-animated"
                style={{
                  width: `${topic.progress}%`,
                  background: isCompleted ? "#22c55e" : topic.progress > 0 ? "#3b82f6" : "transparent",
                }} />
            </div>
          </div>
          <div className="text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0">
            <ChevronIcon open={isExpanded} />
          </div>
        </button>

        <div className={`accordion-content ${isExpanded ? "open" : ""}`}>
          <div className="accordion-inner">
            <div className="px-4 pb-4 space-y-1 border-t border-[var(--color-border-subtle)]">
              <div className="pt-3" />
              {topic.subtopics.map(subtopic => (
                <SubtopicSection
                  key={subtopic.id}
                  subtopic={subtopic}
                  onAction={onAction}
                  defaultOpen={subtopic.hasAvailableTasks}
                  isUpdatingTaskIds={isUpdatingTaskIds}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
