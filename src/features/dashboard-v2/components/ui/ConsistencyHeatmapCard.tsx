import React from "react";
import type { HeatmapDataViewModel } from "../../types";

interface ConsistencyHeatmapCardProps {
  heatmap: HeatmapDataViewModel;
}

export function ConsistencyHeatmapCard({ heatmap }: ConsistencyHeatmapCardProps) {
  // Map 0-4 intensity to actual tailwind colors to keep UI simple
  const intensityMap: Record<number, string> = {
    0: "bg-white/5",
    1: "bg-[#02b37b]/30",
    2: "bg-[#02b37b]/60",
    3: "bg-[#02b37b]/90",
    4: "bg-[#02b37b]",
  };

  return (
    <div className="flex flex-col p-6 rounded-2xl bg-[#0f0f0f] border border-white/5 w-full">
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col">
          <h3 className="text-xs font-bold tracking-widest text-neutral-500 uppercase mb-1">ACTIVITY</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>Less</span>
          <div className="flex gap-1.5">
            <span className={`w-[10px] h-[10px] rounded-full ${intensityMap[0]}`} />
            <span className={`w-[10px] h-[10px] rounded-full ${intensityMap[1]}`} />
            <span className={`w-[10px] h-[10px] rounded-full ${intensityMap[2]}`} />
            <span className={`w-[10px] h-[10px] rounded-full ${intensityMap[3]}`} />
            <span className={`w-[10px] h-[10px] rounded-full ${intensityMap[4]}`} />
          </div>
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2 custom-scrollbar">
        {/* We arrange cells in a grid. Standard GitHub graph is column-major.
            For simplicity in this 2D mock, we'll flex-wrap them or grid them if row-major.
            Since standard displays are horizontally scrollable, we'll use a responsive flex mapping.
            Screenshot shows roughly 2 long rows. Let's force a 4-row dense grid to match GitHub layout. */}
        <div className="inline-flex min-w-max">
          <div className="grid grid-rows-4 grid-flow-col gap-[4px] auto-cols-max">
            {heatmap.cells.map((cell, idx) => (
              <div 
                key={`${cell.date}-${idx}`}
                title={`${cell.date} - Intensity: ${cell.intensity}`}
                className={`w-[14px] h-[14px] rounded-full transition-colors duration-300 hover:ring-2 hover:ring-white/20 ${intensityMap[cell.intensity] || intensityMap[0]}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
