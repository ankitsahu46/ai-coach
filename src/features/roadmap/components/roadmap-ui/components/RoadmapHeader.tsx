/**
 * RoadmapHeader — Page header with progress, streak, and "Next Task" button.
 * Receives pre-computed ProgressStats and StreakView. No logic.
 */

import type { ProgressStats, StreakView, OnAction } from "../types";
import { ProgressRing } from "./ProgressRing";
import { StreakWidget } from "./StreakWidget";
import { SparkleIcon, ArrowRightIcon } from "./Icons";

export function RoadmapHeader({ title, progress, streak, recommendedTaskId, onAction }: {
  title: string;
  progress: ProgressStats;
  streak: StreakView | null;
  recommendedTaskId: string | null;
  onAction: OnAction;
}) {
  return (
    <header className="mb-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
          </div>
          <p className="text-xs text-zinc-500">
            Master your learning path · {progress.completed}/{progress.total} tasks · {progress.remainingHours}h remaining
          </p>
        </div>
        {streak && <StreakWidget streak={streak} />}
      </div>

      <div className="flex items-center gap-4 p-3 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]">
        <ProgressRing progress={progress.percentage} size={44} strokeWidth={3.5} />
        <div className="flex-1 space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-white tabular-nums">{progress.percentage}%</span>
            <span className="text-[11px] text-zinc-500">complete</span>
            <span className="text-zinc-700 text-[11px]">·</span>
            <span className="text-[11px] text-blue-400/70">{progress.available} tasks available</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden" role="progressbar" aria-valuenow={progress.percentage} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full progress-bar-animated"
              style={{ width: `${progress.percentage}%`, background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }} />
          </div>
        </div>

        {recommendedTaskId && (
          <button onClick={() => onAction({ type: "scroll-to-recommended" })}
            className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/[0.06] border border-blue-500/10 text-xs text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/15 transition-all cursor-pointer"
            aria-label="Scroll to next recommended task">
            <SparkleIcon />
            <span className="font-medium">Next Task</span>
            <ArrowRightIcon />
          </button>
        )}
      </div>
    </header>
  );
}
