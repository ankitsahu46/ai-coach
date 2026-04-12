/**
 * TaskRow — Single task row in the roadmap.
 * Receives TaskView (pre-computed by selector). No logic.
 * key= MUST use task.id (stable UUID), NEVER array index.
 */

import type { TaskView, OnAction } from "../types";
import { CheckIcon, LockIcon, SkipIcon, ArrowRightIcon } from "./Icons";

const BORDER_COLORS: Record<string, string> = {
  learn: "border-l-blue-500",
  practice: "border-l-amber-500",
  project: "border-l-purple-500",
};

const STATE_BADGE: Record<string, { badge: string; bg: string; text: string }> = {
  completed: { badge: "Done",    bg: "bg-emerald-500/10", text: "text-emerald-400" },
  available: { badge: "Ready",   bg: "bg-blue-500/10",    text: "text-blue-400" },
  locked:    { badge: "Locked",  bg: "bg-zinc-500/10",    text: "text-zinc-500" },
  skipped:   { badge: "Skipped", bg: "bg-gray-500/10",    text: "text-gray-500" },
};

export function TaskRow({ task, onAction }: { key?: string; task: TaskView; onAction: OnAction }) {
  const borderColor = BORDER_COLORS[task.type] || "border-l-zinc-500";
  const stateConfig = STATE_BADGE[task.state] || STATE_BADGE.locked;
  const isLocked = task.state === "locked";
  const isCompleted = task.state === "completed";
  const isSkipped = task.state === "skipped";

  return (
    <div
      id={task.isRecommended ? "recommended-task" : `task-${task.id}`}
      data-task-id={task.id}
      onClick={() => { if (!isLocked) onAction({ type: "open", taskId: task.id }); }}
      className={`
        task-row-hover group relative flex flex-col px-3.5 py-2.5 rounded-lg border-l-[3px]
        transition-all duration-200
        ${borderColor}
        ${isLocked ? "opacity-40 cursor-default" : "hover:bg-[var(--color-bg-card-hover)] cursor-pointer"}
        ${isCompleted ? "opacity-65" : ""}
        ${isSkipped ? "opacity-45" : ""}
        ${task.isRecommended ? "task-recommended bg-blue-500/[0.03]" : "bg-[var(--color-bg-card)]"}
        ${task.isLoading ? "opacity-50 pointer-events-none" : ""}
      `}
      role="button"
      tabIndex={isLocked ? -1 : 0}
      aria-label={`${task.title} — ${stateConfig.badge}`}
      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !isLocked) { e.preventDefault(); onAction({ type: "open", taskId: task.id }); } }}
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-4 flex items-center justify-center">
          {isCompleted && <CheckIcon animated />}
          {isLocked && <LockIcon />}
          {isSkipped && <SkipIcon />}
          {task.state === "available" && (
            <div className={`w-2 h-2 rounded-full ${task.isRecommended ? "bg-blue-400 animate-pulse" : "bg-zinc-600"}`} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-[13px] font-medium ${isCompleted ? "text-zinc-500 line-through decoration-zinc-700" : isLocked ? "text-zinc-600" : isSkipped ? "text-zinc-500 line-through decoration-zinc-700" : "text-zinc-200"}`}>
              {task.title}
            </span>
            {task.isRecommended && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/15 text-blue-300 border border-blue-400/20">
                <ArrowRightIcon /> START HERE
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-zinc-600 tabular-nums">{task.estimatedTime}</span>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide ${stateConfig.bg} ${stateConfig.text}`}>
            {stateConfig.badge}
          </span>
        </div>
      </div>

      {task.dependencyHint && (
        <div className="dep-hint flex items-center gap-1.5 pl-7">
          <LockIcon />
          <span className="text-[10px] text-zinc-600 italic">{task.dependencyHint}</span>
        </div>
      )}
    </div>
  );
}
