import React from "react";
import type { RadarDataViewModel } from "../../types";

interface SkillRadarCardProps {
  radar: RadarDataViewModel;
}

export function SkillRadarCard({ radar }: SkillRadarCardProps) {
  return (
    <div className="flex flex-col p-6 rounded-2xl bg-[#0f0f0f] border border-white/5 h-full min-h-[300px]">
      <div className="flex flex-col mb-6">
        <h3 className="text-xs font-bold tracking-widest text-neutral-500 uppercase mb-1">SKILL PROFILE</h3>
      </div>

      <div className="flex-1 flex items-center justify-center relative w-full mt-4 px-8">
        {/* SVG Container mapping 0-100 coordinates */}
        <svg 
          viewBox="-20 -20 140 140" 
          className="w-full max-w-[280px] h-auto overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Base web pattern (3 concentric polygons) */}
          <polygon points="50,0 93.3,25 93.3,75 50,100 6.7,75 6.7,25" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <polygon points="50,16.7 78.9,33.3 78.9,66.7 50,83.3 21.1,66.7 21.1,33.3" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <polygon points="50,33.3 64.4,41.7 64.4,58.3 50,66.7 35.6,58.3 35.6,41.7" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          
          {/* Axis lines */}
          {radar.axisLines.map((line, i) => (
            <line 
              key={i} 
              x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} 
              stroke="rgba(255,255,255,0.05)" 
              strokeWidth="1" 
            />
          ))}

          {/* Actual Skill Polygon */}
          <polygon 
            points={radar.pointsString} 
            fill="rgba(2, 179, 123, 0.2)" 
            stroke="#02b37b" 
            strokeWidth="2" 
            strokeLinejoin="round" 
            className="transition-all duration-700 ease-out"
          />

          {/* Labels */}
          {radar.labelPositions.map((lp, i) => (
            <text 
              key={i} 
              x={lp.x} 
              y={lp.y} 
              textAnchor={lp.align} 
              fill="#9ca3af" 
              fontSize="8"
              className="font-medium"
            >
              {lp.text}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
