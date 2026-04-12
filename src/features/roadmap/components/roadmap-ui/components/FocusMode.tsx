/**
 * FocusMode — Full-screen distraction-free task focus.
 * Receives FocusTaskView (pre-computed). All data from selectors.
 *
 * Local state (UI-only):
 *  - elapsedSeconds: stopwatch display ONLY. No logic derives from it.
 *  - isCompleted: transition animation state.
 *
 * Keyboard: Enter = complete, Esc = exit.
 */

import { useState, useEffect, useRef } from "react";
import type { FocusTaskView, OnAction, TaskType } from "../types";
import { CheckIcon, ClockIcon, SparkleIcon, ExitIcon } from "./Icons";

const TASK_TYPE_CONFIG: Record<TaskType, { color: string; bgColor: string; icon: string; label: string }> = {
  learn:    { color: "text-blue-400",   bgColor: "bg-blue-500/10",   icon: "📖", label: "Learn" },
  practice: { color: "text-amber-400",  bgColor: "bg-amber-500/10",  icon: "🧪", label: "Practice" },
  project:  { color: "text-purple-400", bgColor: "bg-purple-500/10", icon: "🚀", label: "Project" },
};

const RESOURCE_ICONS: Record<string, string> = {
  docs: "📄", video: "🎥", article: "📝", exercise: "💻",
};

export function FocusMode({ task, onAction, isLoading = false }: {
  task: FocusTaskView;
  onAction: OnAction;
  isLoading?: boolean;
}) {
  const typeConfig = TASK_TYPE_CONFIG[task.type];
  const [isCompleted, setIsCompleted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 4.4 — Reset state cleanly when task changes (exit safety)
  useEffect(() => {
    setIsCompleted(false);
    setElapsed(0);
    // Restart timer for new task
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [task.id]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Enter = complete, Esc = exit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isCompleted) {
        handleComplete();
      }
      if (e.key === "Escape") onAction({ type: "exit-focus" });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted]);

  const handleComplete = () => {
    setIsCompleted(true);
    if (timerRef.current) clearInterval(timerRef.current);
    onAction({ type: "complete", taskId: task.id });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b] flex items-center justify-center focus-mode-enter" role="dialog" aria-modal="true" aria-label={`Focus mode: ${task.title}`}>
      {/* Exit button */}
      <button onClick={() => onAction({ type: "exit-focus" })}
        className="absolute top-6 right-6 flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-colors text-xs cursor-pointer"
        aria-label="Exit focus mode">
        <ExitIcon /> Exit Focus Mode
      </button>

      {/* Top bar: type + timer */}
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${typeConfig.bgColor} ${typeConfig.color}`}>
          {typeConfig.icon} {typeConfig.label}
        </span>
        <span className="text-xs text-zinc-500 flex items-center gap-1">
          <ClockIcon /> {task.estimatedTime}
        </span>
        <span className="text-xs text-zinc-600 font-mono tabular-nums timer-pulse" aria-label={`Elapsed time: ${formatTime(elapsed)}`}>
          ⏱ {formatTime(elapsed)}
        </span>
      </div>

      {/* Main content */}
      <div className="max-w-xl w-full px-8">
        {!isCompleted ? (
          <>
            {task.isRecommended && (
              <div className="flex justify-center mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/15">
                  <SparkleIcon /> Recommended for you
                </span>
              </div>
            )}
            <h1 className="text-2xl font-bold text-white text-center mb-4 leading-tight">{task.title}</h1>
            <p className="text-sm text-zinc-400 text-center leading-relaxed mb-6 max-w-md mx-auto">{task.description}</p>

            {/* Why this matters */}
            {task.unlocks.length > 0 && (
              <div className="mb-6 mx-auto max-w-sm">
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-purple-500/[0.04] border border-purple-500/10">
                  <span className="text-sm shrink-0 mt-0.5">💡</span>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-purple-400/60 mb-0.5">Why this matters</div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Completing this unlocks: {task.unlocks.slice(0, 2).map((u, i) => (
                        <span key={u}><span className="text-zinc-300 font-medium">{u}</span>{i < Math.min(task.unlocks.length, 2) - 1 ? ", " : ""}</span>
                      ))}
                      {task.unlocks.length > 2 && <span className="text-zinc-500"> and {task.unlocks.length - 2} more</span>}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Resources */}
            {task.resources.length > 0 && (
              <div className="mb-6 space-y-2 max-w-sm mx-auto">
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 text-center mb-2">Learning Resources</h4>
                {task.resources.map((res) => (
                  <a key={res.url} href={res.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-zinc-800/40 border border-zinc-800 hover:bg-zinc-800/70 hover:border-zinc-700 transition-all group">
                    <span>{RESOURCE_ICONS[res.type]}</span>
                    <span className="text-sm text-zinc-300 group-hover:text-white transition-colors flex-1">{res.title}</span>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-zinc-600 group-hover:text-zinc-400 transition-colors">
                      <path d="M6 3h7v7M13 3L6 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
              <button onClick={handleComplete}
                disabled={isLoading}
                className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500/15 text-emerald-400 font-semibold text-sm border border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/35 transition-all cursor-pointer ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
                aria-label="Mark task as complete">
                <CheckIcon /> Mark as Complete
              </button>
              <button onClick={() => onAction({ type: "skip", taskId: task.id })}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer">
                Skip this task →
              </button>
              {/* Keyboard hint */}
              <div className="keyboard-hint text-[10px] text-zinc-700 flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 font-mono text-[9px]">Enter</kbd>
                <span>to complete</span>
                <span className="mx-1">·</span>
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 font-mono text-[9px]">Esc</kbd>
                <span>to exit</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-white mb-2">Task Completed!</h2>
            <p className="text-sm text-zinc-400 mb-2">{task.title}</p>
            <p className="text-xs text-zinc-600 mb-6">Finished in {formatTime(elapsed)}</p>

            {/* Next task suggestion */}
            {task.nextTask ? (
              <div className="space-y-3">
                <button onClick={() => onAction({ type: "focus", taskId: task.nextTask!.id })}
                  className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-500/10 text-blue-400 font-semibold text-sm border border-blue-500/15 hover:bg-blue-500/15 transition-all cursor-pointer">
                  Next: {task.nextTask.title} →
                </button>
                <button onClick={() => onAction({ type: "exit-focus" })}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer">
                  Back to roadmap
                </button>
              </div>
            ) : (
              <button onClick={() => onAction({ type: "exit-focus" })}
                className="px-6 py-3 rounded-xl bg-blue-500/10 text-blue-400 font-semibold text-sm border border-blue-500/15 hover:bg-blue-500/15 transition-all cursor-pointer">
                Continue Learning →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Skills at bottom */}
      {task.skills.length > 0 && !isCompleted && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-600 mr-1">Skills:</span>
          {task.skills.map(skill => (
            <span key={skill} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-800/50 text-zinc-500 border border-zinc-800">
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
