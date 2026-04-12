/**
 * TaskDetailPanel — Slide-over detail panel for a task.
 * Receives TaskDetailView (pre-computed). All actions emit via onAction.
 * Local state: closing animation only.
 * Focus trapping: Esc closes panel.
 */

import { useState, useEffect, useCallback } from "react";
import type { TaskDetailView, OnAction, TaskType } from "../types";
import { CheckIcon, LockIcon, SkipIcon, CloseIcon, SparkleIcon, ClockIcon, BookmarkIcon, FocusIcon, UndoIcon, ExternalLinkIcon } from "./Icons";

const TASK_TYPE_CONFIG: Record<TaskType, { color: string; bgColor: string; icon: string; label: string }> = {
  learn:    { color: "text-blue-400",   bgColor: "bg-blue-500/10",   icon: "📖", label: "Learn" },
  practice: { color: "text-amber-400",  bgColor: "bg-amber-500/10",  icon: "🧪", label: "Practice" },
  project:  { color: "text-purple-400", bgColor: "bg-purple-500/10", icon: "🚀", label: "Project" },
};

const RESOURCE_ICONS: Record<string, string> = {
  docs: "📄", video: "🎥", article: "📝", exercise: "💻",
};

export function TaskDetailPanel({ task, onAction, isLoading = false }: {
  task: TaskDetailView;
  onAction: OnAction;
  isLoading?: boolean;
}) {
  const [closing, setClosing] = useState(false);
  const typeConfig = TASK_TYPE_CONFIG[task.type];

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => onAction({ type: "close-panel" }), 250);
  }, [onAction]);

  // Focus trapping: Esc closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleClose]);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label={`Task details: ${task.title}`}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm slide-over-backdrop" onClick={handleClose} />

      <aside className={`relative w-full max-w-md bg-[#111114] border-l border-[var(--color-border-medium)] shadow-2xl flex flex-col slide-over-panel ${closing ? "closing" : ""}`}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${typeConfig.bgColor} ${typeConfig.color}`}>
              {typeConfig.icon} {typeConfig.label}
            </span>
            <span className="text-[11px] text-zinc-500 flex items-center gap-1"><ClockIcon /> {task.estimatedTime}</span>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer" aria-label="Close panel">
            <CloseIcon />
          </button>
        </div>

        {/* Content — ACTION-FIRST ordering */}
        <div className="flex-1 overflow-y-auto">

          {/* 1. Title Block */}
          <div className="p-5 pb-0">
            {task.isRecommended && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/15 mb-2">
                <SparkleIcon /> RECOMMENDED
              </span>
            )}
            <h2 className="text-lg font-bold text-white leading-snug">{task.title}</h2>
          </div>

          {/* 2. PRIMARY ACTION — right after title */}
          {task.state === "available" && (
            <div className="px-5 pt-4 pb-2 space-y-2">
              <button onClick={() => onAction({ type: "complete", taskId: task.id })}
                disabled={isLoading}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/15 text-emerald-400 font-semibold text-sm border border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/35 transition-all cursor-pointer ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
                aria-label="Mark task as complete">
                <CheckIcon /> Mark as Complete
              </button>
              <div className="flex gap-2">
                <button onClick={() => onAction({ type: "skip", taskId: task.id })}
                  disabled={isLoading}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/40 text-zinc-400 text-xs font-medium border border-zinc-700/20 hover:bg-zinc-800 hover:text-zinc-300 transition-all cursor-pointer ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
                  aria-label="Skip task">
                  <SkipIcon /> Skip
                </button>
                <button onClick={() => onAction({ type: "bookmark", taskId: task.id })}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    task.isBookmarked
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-zinc-800/40 text-zinc-400 border-zinc-700/20 hover:bg-zinc-800 hover:text-zinc-300"
                  }`}
                  aria-label={task.isBookmarked ? "Remove bookmark" : "Bookmark task"}>
                  <BookmarkIcon filled={task.isBookmarked} /> {task.isBookmarked ? "Saved" : "Save"}
                </button>
                <button onClick={() => onAction({ type: "focus", taskId: task.id })}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500/[0.06] text-blue-400 text-xs font-medium border border-blue-500/10 hover:bg-blue-500/10 transition-all cursor-pointer"
                  aria-label="Enter focus mode">
                  <FocusIcon /> Focus
                </button>
              </div>
            </div>
          )}
          {task.state === "completed" && (
            <div className="px-5 pt-3 pb-1">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.06] text-emerald-400 text-sm">
                <CheckIcon /> This task is completed
              </div>
            </div>
          )}
          {task.state === "locked" && (
            <div className="px-5 pt-3 pb-1">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/30 text-zinc-500 text-sm">
                <LockIcon /> Complete prerequisites to unlock
              </div>
            </div>
          )}
          {task.state === "skipped" && (
            <div className="px-5 pt-3 pb-1 space-y-2">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/30 text-gray-500 text-sm">
                <SkipIcon /> This task was skipped
              </div>
              <button onClick={() => onAction({ type: "unskip", taskId: task.id })}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-500/[0.06] text-blue-400 font-medium text-xs border border-blue-500/10 hover:bg-blue-500/10 transition-all cursor-pointer"
                aria-label="Restore skipped task">
                <UndoIcon /> Restore Task
              </button>
            </div>
          )}

          <div className="mx-5 my-4 border-t border-zinc-800" />

          {/* "Why this matters" — downstream unlock */}
          {task.unlocks.length > 0 && (
            <div className="px-5 pb-4">
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-purple-500/[0.04] border border-purple-500/10">
                <span className="text-sm shrink-0 mt-0.5">💡</span>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-purple-400/60 mb-0.5">Why this matters</div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Completing this unlocks: {task.unlocks.slice(0, 3).map((u, i) => (
                      <span key={u}><span className="text-zinc-300 font-medium">{u}</span>{i < Math.min(task.unlocks.length, 3) - 1 ? ", " : ""}</span>
                    ))}
                    {task.unlocks.length > 3 && <span className="text-zinc-500"> and {task.unlocks.length - 3} more</span>}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="px-5 pb-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">What you'll learn</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{task.description}</p>
          </div>

          {/* Resources */}
          {task.resources.length > 0 && (
            <div className="px-5 pb-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">Resources</h3>
              <div className="space-y-1.5">
                {task.resources.map((res) => (
                  <a key={res.url} href={res.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-zinc-800/40 border border-zinc-800 hover:bg-zinc-800/70 hover:border-zinc-700 transition-all group">
                    <span className="text-base">{RESOURCE_ICONS[res.type] || "📄"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors truncate">{res.title}</div>
                      <div className="text-[10px] text-zinc-600 capitalize">{res.type}</div>
                    </div>
                    <ExternalLinkIcon />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {task.skills.length > 0 && (
            <div className="px-5 pb-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {task.skills.map(skill => (
                  <span key={skill} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-800">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prerequisites */}
          {task.prerequisites.length > 0 && (
            <div className="px-5 pb-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">Prerequisites</h3>
              <div className="space-y-1">
                {task.prerequisites.map((dep) => (
                  <div key={dep.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/20 text-sm">
                    {dep.met ? <CheckIcon /> : <LockIcon />}
                    <span className={dep.met ? "text-zinc-400" : "text-zinc-500"}>{dep.title}</span>
                    {dep.met && <span className="text-[10px] text-emerald-500/60 ml-auto">Done</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
