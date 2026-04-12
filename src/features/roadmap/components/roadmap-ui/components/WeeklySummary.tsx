/**
 * WeeklySummary — Weekly stats card with skill unlock badges.
 * Receives pre-computed data. No logic, no DB queries.
 */

import type { WeeklySummaryView } from "../types";

export function WeeklySummary({ data }: { data: WeeklySummaryView }) {
  return (
    <div className="mb-4 p-3.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)]">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">📊</span>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">This Week</h3>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-lg font-bold text-white tabular-nums">{data.tasksCompleted}</div>
          <div className="text-[10px] text-zinc-600">Tasks done</div>
        </div>
        <div>
          <div className={`text-lg font-bold tabular-nums ${data.vsLastWeek > 0 ? "text-emerald-400" : data.vsLastWeek < 0 ? "text-rose-400" : "text-zinc-400"}`}>
            {data.vsLastWeek > 0 ? "+" : ""}{data.vsLastWeek}
          </div>
          <div className="text-[10px] text-zinc-600">vs last week</div>
        </div>
        <div>
          <div className="text-lg font-bold text-purple-400 tabular-nums">{data.unlockedSkills.length}</div>
          <div className="text-[10px] text-zinc-600">Skills unlocked</div>
        </div>
      </div>
      {data.unlockedSkills.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-zinc-800/50">
          <div className="flex flex-wrap gap-1">
            {data.unlockedSkills.slice(0, 5).map(skill => (
              <span key={skill} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/15">
                🏆 {skill}
              </span>
            ))}
            {data.unlockedSkills.length > 5 && (
              <span className="text-[10px] text-zinc-600 self-center">+{data.unlockedSkills.length - 5} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
