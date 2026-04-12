/**
 * StreakWidget — Displays streak counter + daily progress ring.
 * Receives all data via props. No logic.
 */

import type { StreakView } from "../types";
import { ProgressRing } from "./ProgressRing";

export function StreakWidget({ streak }: { streak: StreakView }) {
  const todayProgress = Math.min(Math.round((streak.todayCompleted / streak.todayGoal) * 100), 100);
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        <span className="flame-flicker text-lg">🔥</span>
        <div className="leading-none">
          <span className="text-sm font-bold text-white tabular-nums">{streak.days}</span>
          <span className="text-[10px] text-zinc-500 ml-1">day{streak.days !== 1 ? "s" : ""}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <ProgressRing progress={todayProgress} size={28} strokeWidth={3} />
        <div className="leading-none">
          <div className="text-[10px] text-zinc-500">Today</div>
          <div className="text-[11px] font-medium text-zinc-300 tabular-nums">{streak.todayCompleted}/{streak.todayGoal}</div>
        </div>
      </div>
    </div>
  );
}
