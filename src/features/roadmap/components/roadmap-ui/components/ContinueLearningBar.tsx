/**
 * ContinueLearningBar — Resume from last task.
 * Receives pre-computed lastTask from props. Emits "resume" action.
 */

import type { TaskType, OnAction } from "../types";
import { PlayIcon } from "./Icons";

const TYPE_CONFIG: Record<TaskType, { color: string; icon: string; label: string }> = {
  learn:    { color: "text-blue-400",   icon: "📖", label: "Learn" },
  practice: { color: "text-amber-400",  icon: "🧪", label: "Practice" },
  project:  { color: "text-purple-400", icon: "🚀", label: "Project" },
};

export function ContinueLearningBar({ lastTask, onAction }: {
  lastTask: { id: string; title: string; type: TaskType } | null;
  onAction: OnAction;
}) {
  if (!lastTask) return null;
  const typeConfig = TYPE_CONFIG[lastTask.type];

  return (
    <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]">
      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
        <PlayIcon />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Continue where you left off</div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200 truncate">{lastTask.title}</span>
          <span className={`text-[10px] font-medium ${typeConfig.color}`}>{typeConfig.icon} {typeConfig.label}</span>
        </div>
      </div>
      <button onClick={() => onAction({ type: "resume" })}
        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-semibold hover:bg-blue-500/15 transition-colors cursor-pointer border border-blue-500/15"
        aria-label="Resume learning">
        <PlayIcon /> Resume
      </button>
    </div>
  );
}
