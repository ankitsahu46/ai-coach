import { CheckCircle, Clock } from "lucide-react";

interface StatsGridProps {
  stats: {
    completed: number;
    remaining: number;
    total: number;
  };
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
          <CheckCircle size={24} />
        </div>
        <div>
          <p className="text-sm text-white/60 mb-1">Topics Completed</p>
          <p className="text-2xl font-bold text-white">
            {stats.completed} <span className="text-sm font-medium text-white/40">/ {stats.total}</span>
          </p>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400">
          <Clock size={24} />
        </div>
        <div>
          <p className="text-sm text-white/60 mb-1">Topics Remaining</p>
          <p className="text-2xl font-bold text-white">{stats.remaining}</p>
        </div>
      </div>
    </div>
  );
}
