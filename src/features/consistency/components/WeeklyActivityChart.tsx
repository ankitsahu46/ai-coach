import React from "react";

interface Props {
  data: { date: string; count: number }[];
}

export function WeeklyActivityChart({ data }: Props) {
  // We need exactly 7 days to display smoothly
  // If data doesn't have 7 days, we pad it out for UI consistency.
  const chartData = [...data];
  
  // Pad until length is 7 matching today backwards
  if (chartData.length < 7) {
     const today = new Date();
     const existingDates = new Set(chartData.map(d => d.date));
     
     // Look backwards 7 days to fill in gaps with count: 0
     for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setUTCDate(d.getUTCDate() - i);
        const str = d.toISOString().split("T")[0];
        if (!existingDates.has(str)) {
           chartData.push({ date: str, count: 0 });
        }
     }
  }

  // Ensure chronological sort: Mon -> Tue -> Wed
  chartData.sort((a, b) => a.date.localeCompare(b.date));

  // Limit to 7 elements just in case
  const finalData = chartData.slice(-7);
  const maxCount = Math.max(...finalData.map(d => d.count), 2); // Avoid div by 0, minimum height baseline

  return (
    <div className="flex flex-col bg-slate-900/40 border border-white/5 p-4 rounded-xl backdrop-blur-md justify-between min-h-[140px]">
      <h3 className="text-slate-400 text-sm font-medium mb-3">Last 7 Days (UTC)</h3>
      
      <div className="flex items-end justify-between gap-1 flex-1 h-20 px-1 mt-auto">
        {finalData.map((day, i) => {
          const heightPercent = Math.max(10, Math.floor((day.count / maxCount) * 100)); // Min 10% height for visibility
          const isEmpty = day.count === 0;

          // e.g "2026-04-03" -> "04"
          const dayLabel = day.date.split("-")[2]; 

          return (
            <div key={day.date} className="flex flex-col items-center justify-end h-full gap-1 group flex-1">
              <div 
                className={`w-full max-w-[24px] rounded-t-sm transition-all duration-300 relative ${
                  isEmpty ? "bg-slate-800" : "bg-indigo-500 hover:bg-indigo-400"
                }`}
                style={{ height: `${heightPercent}%` }}
              >
                  {/* Tooltip on hover */}
                 {!isEmpty && (
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded pointer-events-none whitespace-nowrap z-10 transition-opacity">
                      {day.count} {day.count === 1 ? "completion" : "completions"}
                    </div>
                 )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 leading-none">{dayLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
