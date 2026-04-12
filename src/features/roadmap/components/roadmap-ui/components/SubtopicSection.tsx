/**
 * SubtopicSection — Collapsible subtopic with progress bar.
 * Local state: isOpen (UI toggle only). No business logic.
 */

import { useState } from "react";
import type { SubtopicView, OnAction } from "../types";
import { ChevronIcon } from "./Icons";
import { TaskRow } from "./TaskRow";

export function SubtopicSection({ subtopic, onAction, defaultOpen, isUpdatingTaskIds }: {
  key?: string;
  subtopic: SubtopicView;
  onAction: OnAction;
  defaultOpen: boolean;
  isUpdatingTaskIds?: Set<string>;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-1 py-2 cursor-pointer group"
        aria-expanded={isOpen}
        aria-label={`${subtopic.title} — ${subtopic.completedCount} of ${subtopic.totalCount} completed`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${subtopic.progress === 100 ? "bg-emerald-400" : subtopic.hasAvailableTasks ? "bg-blue-400" : "bg-zinc-600"}`} />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 truncate group-hover:text-zinc-300 transition-colors">{subtopic.title}</h4>
          <span className="text-[10px] text-zinc-600 tabular-nums shrink-0">{subtopic.completedCount}/{subtopic.totalCount}</span>
        </div>
        <div className="w-20 h-1 bg-zinc-800 rounded-full overflow-hidden shrink-0" role="progressbar" aria-valuenow={subtopic.progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full progress-bar-animated"
            style={{ width: `${subtopic.progress}%`, background: subtopic.progress === 100 ? "#22c55e" : subtopic.progress > 0 ? "#3b82f6" : "transparent" }} />
        </div>
        <div className="text-zinc-600 shrink-0">
          <ChevronIcon open={isOpen} size={14} />
        </div>
      </button>

      <div className={`subtopic-content ${isOpen ? "open" : ""}`}>
        <div className="subtopic-inner">
          <div className="space-y-1 pl-1 pb-1">
            {subtopic.tasks.map(task => (
              <TaskRow key={task.id} task={{ ...task, isLoading: task.isLoading || isUpdatingTaskIds?.has(task.id) }} onAction={onAction} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
