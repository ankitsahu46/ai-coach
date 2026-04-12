/**
 * DailyPlanBar — Smart daily plan with AI reasoning.
 * Emits actions via onAction. No logic.
 */

import type { DailyPlanView, OnAction, TaskType } from "../types";
import { ClockIcon, FocusIcon } from "./Icons";

const TASK_TYPE_CONFIG: Record<TaskType, { color: string; bgColor: string; icon: string; label: string }> = {
  learn:    { color: "text-blue-400",   bgColor: "bg-blue-500/10",   icon: "📖", label: "Learn" },
  practice: { color: "text-amber-400",  bgColor: "bg-amber-500/10",  icon: "🧪", label: "Practice" },
  project:  { color: "text-purple-400", bgColor: "bg-purple-500/10", icon: "🚀", label: "Project" },
};

const DIFF_COLORS: Record<string, string> = {
  Easy: "text-emerald-500", Medium: "text-amber-500", Stretch: "text-purple-500",
};

const ORDER_EMOJI = ["1️⃣", "2️⃣", "3️⃣"];

export function DailyPlanBar({ plan, onAction }: { plan: DailyPlanView; onAction: OnAction }) {
  if (plan.tasks.length === 0) return null;

  return (
    <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-500/[0.04] to-purple-500/[0.04] border border-blue-500/10">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">🎯</span>
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Today's Plan</h3>
          <span className="text-[10px] text-zinc-600 px-1.5 py-0.5 rounded-md bg-zinc-800/50">{plan.totalTime}</span>
        </div>
      </div>
      <p className="text-[11px] text-zinc-500 mb-3 italic">{plan.reasoning}</p>

      <div className="flex gap-2">
        {plan.tasks.map((task, i) => {
          const typeConfig = TASK_TYPE_CONFIG[task.type];
          return (
            <div key={task.id}
              className="flex-1 group rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-medium)] transition-all overflow-hidden">
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[10px]">{ORDER_EMOJI[i] || `${i + 1}️⃣`}</span>
                  <span className={`text-[10px] font-medium ${typeConfig.color}`}>{typeConfig.icon} {typeConfig.label}</span>
                  <span className={`text-[9px] font-medium ${DIFF_COLORS[task.difficulty] || "text-zinc-500"} ml-auto`}>{task.difficulty}</span>
                </div>
                <p className="text-[13px] font-medium text-zinc-200 leading-snug mb-2 line-clamp-2">{task.title}</p>
                <div className="flex items-center gap-1 mb-2">
                  <ClockIcon />
                  <span className="text-[10px] text-zinc-600">{task.estimatedTime}</span>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => onAction({ type: "open", taskId: task.id })}
                    className="flex-1 text-[10px] font-medium text-zinc-400 hover:text-zinc-200 py-1.5 rounded-md bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer text-center"
                    aria-label={`Details for ${task.title}`}>
                    Details
                  </button>
                  <button onClick={() => onAction({ type: "focus", taskId: task.id })}
                    className="flex items-center justify-center gap-1 flex-1 text-[10px] font-medium text-blue-400 hover:text-blue-300 py-1.5 rounded-md bg-blue-500/[0.08] hover:bg-blue-500/15 transition-colors cursor-pointer"
                    aria-label={`Focus on ${task.title}`}>
                    <FocusIcon /> Focus
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
