import React, { useEffect, useState } from "react";

interface Props {
  score: number; // 1-100
}

export function ConsistencyScoreCard({ score }: Props) {
  const [displayScore, setDisplayScore] = useState(1);

  useEffect(() => {
    // Basic smooth number increasing animation
    if (displayScore === score) return;

    const stepTime = Math.max(15, Math.floor(1000 / Math.abs(score - displayScore)));
    
    const interval = setInterval(() => {
      setDisplayScore((prev) => {
        if (prev === score) {
          clearInterval(interval);
          return prev;
        }
        return prev < score ? prev + 1 : prev - 1;
      });
    }, stepTime);

    // Cancel previous animation before starting new one
    return () => clearInterval(interval);
  }, [score, displayScore]); 

  // Determine color based on target score (don't animate color)
  const colorClass = 
    score >= 80 ? "text-green-400" :
    score >= 50 ? "text-yellow-400" :
    "text-blue-400";

  return (
    <div className="flex flex-col bg-slate-900/40 border border-white/5 p-4 rounded-xl backdrop-blur-md">
      <h3 className="text-slate-400 text-sm font-medium mb-1">Consistency Score</h3>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${colorClass}`}>
          {displayScore}
        </span>
        <span className="text-slate-500 text-sm">/ 100</span>
      </div>
      <div className="mt-3 h-2 w-full bg-slate-800 rounded-full overflow-hidden relative">
        <div 
          className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out" 
          style={{ width: `${displayScore}%` }} 
        />
      </div>
    </div>
  );
}
