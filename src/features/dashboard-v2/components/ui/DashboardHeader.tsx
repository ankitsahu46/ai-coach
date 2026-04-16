import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

interface DashboardHeaderProps {
  userName: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between w-full mb-8">
      <div className="flex flex-col">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">
          Dashboard
        </h1>
        <p className="text-neutral-400 text-sm md:text-base">
          Welcome back, {userName}. Your AI coach has prepared your daily plan.
        </p>
      </div>
      <div className="flex items-center gap-4 mt-4 sm:mt-0">
        <span className="text-sm font-medium text-neutral-400 bg-[#1c1c1c] border border-white/5 py-1.5 px-4 rounded-full">
          Pro Plan
        </span>
        <button className="flex items-center gap-2 bg-[#02b37b] text-white py-1.5 px-4 rounded-full text-sm font-medium hover:bg-[#029b6a] transition-colors focus:ring-2 focus:ring-[#02b37b]/20 outline-none">
          <Plus size={16} />
          New Roadmap
        </button>
      </div>
    </div>
  );
}
