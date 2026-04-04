import React from "react";

interface Props {
  currentStreak: number;
  longestStreak: number;
  freezeCredits: number;
  lastActiveDate: string | null;
}

// Ensure UTC consistency for comparisons
function getUTCDateString(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

export function StreakCard({ currentStreak, longestStreak, freezeCredits, lastActiveDate }: Props) {
  const today = getUTCDateString(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = getUTCDateString(yesterdayDate);

  const isAtRisk = currentStreak > 0 && lastActiveDate !== today && lastActiveDate !== yesterday;

  let message = "";
  if (isAtRisk) message = "Your streak is at risk ⚠️";
  else if (currentStreak === 0) message = "Start your streak today 🚀";
  else if (currentStreak <= 3) message = "You're building momentum 🔥";
  else if (currentStreak <= 7) message = "Strong consistency 💪";
  else message = "Unstoppable 🔥🔥🔥";

  return (
    <div className="flex flex-col bg-slate-900/40 border border-white/5 p-4 rounded-xl backdrop-blur-md">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-slate-400 text-sm font-medium">Current Streak</h3>
        <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2 py-0.5 rounded-full border border-indigo-500/20">
          ❄️ {freezeCredits} Freezes
        </span>
      </div>
      
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-3xl font-bold font-mono text-white">
          {currentStreak}
        </span>
        <span className="text-slate-500 text-sm">{currentStreak === 1 ? "day" : "days"}</span>
      </div>
      
      <div className={`text-sm font-medium bg-clip-text text-transparent mb-3 ${isAtRisk ? 'bg-gradient-to-r from-red-400 to-rose-500' : 'bg-gradient-to-r from-orange-400 to-rose-400'}`}>
        {message}
      </div>

      <div className="text-xs text-slate-500 pt-3 border-t border-white/5">
        Longest streak: <strong className="text-slate-300">{longestStreak} {longestStreak === 1 ? "day" : "days"}</strong>
      </div>
    </div>
  );
}
