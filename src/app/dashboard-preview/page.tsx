import React from 'react';
import { 
  Flame, Activity, Brain, Target, ArrowRight, ChevronDown, 
  CheckCircle2, Circle, Clock, ArrowUpRight, Plus, Map, 
  LayoutDashboard, Layout, Database, Network, Sparkles, User
} from 'lucide-react';

const HeatmapSquares = () => {
  const weeks = 40;
  const days = 7;
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-4 no-scrollbar">
      {Array.from({ length: weeks }).map((_, wIndex) => (
        <div key={wIndex} className="flex flex-col gap-1.5">
          {Array.from({ length: days }).map((_, dIndex) => {
            const intensity = Math.random() > 0.6 ? Math.floor(Math.random() * 4) + 1 : 0;
            const colors = [
              'bg-white/[0.03] border-white/5', 
              'bg-indigo-500/20 border-indigo-500/20', 
              'bg-indigo-500/40 border-indigo-500/30', 
              'bg-indigo-400/70 border-indigo-400/50', 
              'bg-indigo-400 border-indigo-300/80', 
            ];
            return (
              <div 
                key={dIndex} 
                className={`w-[14px] h-[14px] rounded-[3px] border ${colors[intensity]} transition-all hover:scale-125 hover:border-white/50 cursor-pointer`}
              />
            )
          })}
        </div>
      ))}
    </div>
  );
};

const RadarChart = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible opacity-90 drop-shadow-2xl">
    <polygon points="50,5 95,35 80,90 20,90 5,35" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
    <polygon points="50,20 80,42 68,80 32,80 20,42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
    <polygon points="50,35 65,49 59,70 41,70 35,49" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
    
    <line x1="50" y1="50" x2="50" y2="5" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
    <line x1="50" y1="50" x2="95" y2="35" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
    <line x1="50" y1="50" x2="80" y2="90" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
    <line x1="50" y1="50" x2="20" y2="90" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
    <line x1="50" y1="50" x2="5" y2="35" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
    
    <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.4)" />
            <stop offset="100%" stopColor="rgba(99, 102, 241, 0.1)" />
        </radialGradient>
    </defs>
    <polygon points="50,15 85,38 70,75 35,60 25,45" fill="url(#radarFill)" stroke="rgba(129, 140, 248, 1)" strokeWidth="1.5" strokeLinejoin="round"/>
    
    <circle cx="50" cy="15" r="2.5" fill="#C7D2FE" filter="drop-shadow(0 0 4px #818CF8)"/>
    <circle cx="85" cy="38" r="2.5" fill="#C7D2FE" filter="drop-shadow(0 0 4px #818CF8)"/>
    <circle cx="70" cy="75" r="2.5" fill="#C7D2FE" filter="drop-shadow(0 0 4px #818CF8)"/>
    <circle cx="35" cy="60" r="2.5" fill="#C7D2FE" filter="drop-shadow(0 0 4px #818CF8)"/>
    <circle cx="25" cy="45" r="2.5" fill="#C7D2FE" filter="drop-shadow(0 0 4px #818CF8)"/>
    
    <text x="50" y="-5" fontSize="7" fill="#9CA3AF" textAnchor="middle" fontWeight="500">React</text>
    <text x="100" y="37" fontSize="7" fill="#9CA3AF" textAnchor="start" fontWeight="500">CSS</text>
    <text x="85" y="100" fontSize="7" fill="#9CA3AF" textAnchor="start" fontWeight="500">Sys Design</text>
    <text x="15" y="100" fontSize="7" fill="#9CA3AF" textAnchor="end" fontWeight="500">Node.js</text>
    <text x="-2" y="37" fontSize="7" fill="#9CA3AF" textAnchor="end" fontWeight="500">UI/UX</text>
  </svg>
);

const CircularProgress = ({ percentage }: { percentage: number }) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative w-28 h-28 flex items-center justify-center filter drop-shadow-[0_0_15px_rgba(99,102,241,0.2)]">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100" style={{ overflow: 'visible' }}>
        <circle 
          cx="50" cy="50" r={radius} 
          fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6"
        />
        <circle 
          cx="50" cy="50" r={radius} 
          fill="none" stroke="url(#progressGrad)" strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400">{percentage}%</span>
      </div>
    </div>
  );
};

export default function DashboardPreview() {
  return (
    <div className="min-h-screen bg-[#050505] text-[#A1A1A9] p-4 md:p-8 lg:p-12 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Cinematic Background Glows */}
      <div className="fixed top-[-10%] left-[20%] w-[600px] h-[500px] bg-indigo-500/10 blur-[150px] pointer-events-none rounded-full mix-blend-screen" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-500/10 blur-[150px] pointer-events-none rounded-full mix-blend-screen" />

      <div className="max-w-7xl mx-auto flex flex-col relative z-10 w-full pb-20">
        
        {/* Global Toolbar / Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-8 mb-4">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Learning Dashboard</h1>
                <p className="text-gray-400 text-sm">Welcome back. Maintain your momentum and shape your career.</p>
            </div>
            <div className="flex items-center gap-4">
                <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                    <User className="w-4 h-4" />
                </button>
            </div>
        </header>

        {/* 🌍 1. GLOBAL OVERVIEW */}
        <section className="space-y-6 mb-16">
            <div className="flex items-center gap-2 text-white/90">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-medium tracking-tight">Global Overview</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 lg:gap-6">
                
                {/* 🎯 AI Recommendation (Hero Tile) */}
                <div className="md:col-span-8 lg:col-span-8 relative overflow-hidden rounded-[24px] bg-gradient-to-br from-indigo-900/40 via-[#111115] to-[#0A0A0B] border border-indigo-500/20 p-8 lg:p-10 group shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.15] transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 group-hover:opacity-[0.2] transition-all duration-700 ease-out">
                        <Brain className="w-64 h-64 text-indigo-300" />
                    </div>
                    
                    <div className="relative z-10 h-full flex flex-col justify-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 mb-6 drop-shadow-sm w-max tracking-wide uppercase">
                            <Target className="w-3.5 h-3.5" />
                            Next Recommended Task
                        </div>
                        
                        <h3 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mb-4 drop-shadow-md">Master React Server Components</h3>
                        <p className="text-indigo-100/60 max-w-lg mb-8 text-sm lg:text-base leading-relaxed">
                            Based on your goal to become a Full-Stack Engineer, completing this task will bridge your Frontend and Backend skills organically. You're already 80% done with the React roadmap!
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-4 mt-auto">
                            <button className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-black font-semibold hover:bg-indigo-50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)]">
                                Continue Learning
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2 text-sm text-gray-300 px-4 py-2.5 rounded-xl bg-black/40 border border-white/5 backdrop-blur-md">
                                <Layout className="w-4 h-4 text-indigo-400" />
                                Role: Frontend Developer
                            </div>
                        </div>
                    </div>
                </div>

                {/* 🔥 Streak Card */}
                <div className="md:col-span-4 lg:col-span-4 rounded-[24px] bg-[#111113] border border-white/5 p-8 flex flex-col hover:border-white/10 transition-colors relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                    <div className="absolute right-[-40px] top-[-40px] w-48 h-48 bg-orange-500/20 blur-[50px] pointer-events-none rounded-full" />
                    
                    <div className="relative z-10 flex-1">
                        <div className="flex items-center justify-between mb-8">
                            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                <Flame className="w-5 h-5 text-orange-500" />
                            </div>
                            <div className="bg-white/5 px-3 py-1 rounded-full text-xs text-gray-400 font-medium border border-white/5">Global</div>
                        </div>
                        
                        <div className="mb-2">
                            <span className="text-sm font-medium text-gray-400">Current Streak</span>
                        </div>
                        
                        <div className="flex items-baseline gap-1.5 mb-2">
                            <span className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white to-orange-200 tracking-tighter">5</span>
                            <span className="text-gray-500 font-medium text-lg">days</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-8 flex items-center gap-1.5">
                            <ArrowUpRight className="w-3.5 h-3.5 text-green-400" />
                            Personal best: <span className="text-gray-300">14 days</span>
                        </p>
                    </div>
                    
                    <div className="relative z-10 mt-auto">
                        <div className="flex justify-between text-xs font-semibold text-gray-400 mb-2.5">
                            <span className="text-orange-400">Level 2</span>
                            <span>2 days to Lv 3</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden shadow-inner flex">
                            <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 w-[70%] rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)] relative">
                                <div className="absolute inset-y-0 right-0 w-4 bg-white/20 blur-[2px]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* 📊 Consistency Heatmap */}
                <div className="md:col-span-8 rounded-[24px] bg-[#111113] border border-white/5 p-8 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-emerald-400" />
                            <span className="font-semibold text-white tracking-tight">Consistency Heatmap</span>
                        </div>
                        <div className="text-xs text-gray-500 font-medium px-3 py-1 bg-white/5 rounded-lg border border-white/5">Jan 2026 - Present</div>
                    </div>
                    
                    <div className="w-full relative">
                        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#111113] to-transparent z-10 pointer-events-none" />
                        <HeatmapSquares />
                    </div>

                    <div className="flex items-center gap-3 mt-5 text-xs font-medium text-gray-500 border-t border-white/5 pt-5 justify-between">
                        <div className="flex items-center gap-1.5 text-gray-400">
                           <Clock className="w-3.5 h-3.5" />
                           <span className="text-white">64</span> completions this year
                        </div>
                        <div className="flex items-center gap-2">
                            <span>Less</span>
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-[2px] bg-white/[0.03] border border-white/5" />
                                <div className="w-3 h-3 rounded-[2px] bg-indigo-500/20 border border-indigo-500/20" />
                                <div className="w-3 h-3 rounded-[2px] bg-indigo-500/40 border border-indigo-500/30" />
                                <div className="w-3 h-3 rounded-[2px] bg-indigo-400/70 border border-indigo-400/50" />
                                <div className="w-3 h-3 rounded-[2px] bg-indigo-400 border border-indigo-300/80" />
                            </div>
                            <span>More</span>
                        </div>
                    </div>
                </div>

                {/* 📈 Overall Progress & 🧠 Radar Chart */}
                <div className="md:col-span-4 rounded-[24px] bg-[#111113] border border-white/5 p-8 flex flex-col relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                    <div className="flex items-center gap-2 mb-8 relative z-10">
                        <Target className="w-5 h-5 text-purple-400" />
                        <span className="font-semibold text-white tracking-tight">Global Skill Matrix</span>
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full mb-4">
                        <div className="absolute left-0 bottom-0 opacity-50 transform -translate-x-4 translate-y-4">
                            <div className="text-xs text-gray-500 font-medium mb-3">Overall Mastery</div>
                            <CircularProgress percentage={35} />
                        </div>
                        
                        <div className="w-48 h-48 ml-auto absolute right-0 top-1/2 -translate-y-1/2 mt-4 text-center">
                            <RadarChart />
                        </div>
                    </div>
                </div>

            </div>
        </section>

        {/* 🎯 2. CURRENT FOCUS ROLE */}
        <section className="space-y-6 mb-16 relative">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between pb-4 border-b border-white/5 gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-1.5 h-8 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                    <div>
                         <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Current Focus Role</p>
                        <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-3">
                            Frontend Developer
                        </h2>
                    </div>
                </div>
                <button className="text-sm font-semibold text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 px-4 py-2 bg-white/5 rounded-xl border border-white/5 group">
                    Change Focus <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 pt-2">
                
                {/* Current Role Progress */}
                <div className="col-span-1 border border-white/5 rounded-[24px] bg-gradient-to-b from-[#111113] to-[#0A0A0B] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                    <div className="text-gray-400 text-sm font-semibold mb-2">Roadmap Progress</div>
                    <div className="flex items-baseline gap-2 mb-8">
                        <div className="text-5xl font-bold text-white tracking-tighter">42<span className="text-2xl text-gray-500">%</span></div>
                        <div className="text-sm text-gray-500 font-medium">Completed</div>
                    </div>
                    
                    <div className="space-y-5">
                        {/* Skill Bars */}
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium">
                            <span className="text-gray-300">CSS & Tailwind</span>
                            <span className="text-indigo-400">80%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 w-[80%] rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium">
                            <span className="text-gray-300">React & Zustand</span>
                            <span className="text-purple-400">45%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 w-[45%] rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-medium">
                            <span className="text-gray-300">Next.js & SSR</span>
                            <span className="text-emerald-400">10%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-[10%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Up Next List */}
                <div className="col-span-1 lg:col-span-2 rounded-[24px] bg-[#111113] border border-white/5 p-8 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                    <div className="flex items-center gap-2 mb-6">
                        <Map className="w-5 h-5 text-gray-400" />
                        <span className="font-semibold text-white">Up Next in Frontend</span>
                    </div>
                    
                    <div className="flex-1 space-y-3">
                        {/* Active Next Task */}
                        <div className="p-5 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-transparent relative overflow-hidden group hover:from-indigo-500/20 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center gap-5 box-border">
                            <div className="bg-indigo-500/20 p-2.5 rounded-xl border border-indigo-500/30 flex-shrink-0">
                                <Target className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-3 mb-1.5">
                                    <h4 className="font-semibold text-indigo-50 text-lg">Implement App Router Layouts</h4>
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 rounded shadow-sm">Current Focus</span>
                                </div>
                                <p className="text-sm text-indigo-200/60 mb-4 max-w-xl">Refactor the traditional pages router to use Next.js App Router for optimized nested layouts and server component architecture.</p>
                                <div className="flex items-center gap-5 text-xs text-indigo-300/80 font-semibold">
                                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Est. 2 hours</span>
                                    <span className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5" /> Core Concept</span>
                                    <span className="flex items-center gap-1.5 text-orange-400/80"><Flame className="w-3.5 h-3.5" /> Unskippable</span>
                                </div>
                            </div>
                            <div className="sm:ml-auto mt-4 sm:mt-0">
                                <button className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-white text-black flex items-center justify-center group-hover:bg-indigo-50 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-transform transform group-hover:scale-105 active:scale-95">
                                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                                </button>
                            </div>
                        </div>

                        {/* Locked Tasks visually compacted */}
                        <div className="p-4 rounded-2xl border border-white/5 bg-[#0A0A0B]/50 flex items-center gap-4 opacity-50 select-none">
                            <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                <Circle className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="flex flex-1 items-center justify-between">
                                <h4 className="font-medium text-gray-300">Server Actions Data Fetching</h4>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1">Locked</span>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl border border-white/5 bg-[#0A0A0B]/50 flex items-center gap-4 opacity-30 select-none">
                            <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                                <Circle className="w-4 h-4 text-gray-500" />
                            </div>
                            <div className="flex flex-1 items-center justify-between">
                                <h4 className="font-medium text-gray-300">Streaming SSR & Suspense Boundaries</h4>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 px-2 py-0.5 rounded border border-white/10 flex items-center gap-1">Locked</span>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>

        {/* 🔄 3. ROLE SWITCHER & OTHERS (COMPACT LAYER) */}
        <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
                <LayoutDashboard className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Other Roadmaps</span>
            </div>

            {/* Premium Pill Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2.5 rounded-2xl bg-[#111113]/80 border border-white/5 backdrop-blur-xl">
                
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    
                    <button className="px-5 py-2.5 rounded-xl bg-transparent text-gray-400 font-semibold text-sm hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap">
                    All Overview
                    </button>
                    
                    {/* Active State */}
                    <button className="px-5 py-2.5 rounded-xl bg-white/[0.08] text-white font-semibold text-sm border border-white/10 shadow-sm whitespace-nowrap flex items-center gap-2 relative">
                        <Layout className="w-4 h-4 text-indigo-400" />
                        Frontend
                        <div className="absolute inset-x-4 -bottom-2.5 h-[2px] bg-indigo-500 rounded-t-full" />
                    </button>
                    
                    <div className="w-px h-6 bg-white/10 mx-2 flex-shrink-0" />
                    
                    {/* Inactive States / Compact Progress */}
                    <button className="px-5 py-2.5 rounded-xl bg-transparent text-gray-400 font-semibold text-sm hover:bg-white/5 hover:text-white transition-colors whitespace-nowrap flex items-center gap-3 group">
                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-gray-500 group-hover:text-amber-400 transition-colors" />
                            Backend
                        </div>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-gray-400 font-bold group-hover:bg-amber-400/10 group-hover:text-amber-400 transition-colors border border-white/5">20%</span>
                    </button>
                    
                    <button className="px-5 py-2.5 rounded-xl bg-transparent text-gray-400 font-semibold text-sm hover:bg-white/5 hover:text-white transition-colors whitespace-nowrap flex items-center gap-3 group">
                        <div className="flex items-center gap-2">
                            <Network className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                            DevOps
                        </div>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-gray-400 font-bold group-hover:bg-emerald-400/10 group-hover:text-emerald-400 transition-colors border border-white/5">10%</span>
                    </button>
                </div>

                <div className="pl-2 sm:border-l border-white/5">
                    <button className="flex items-center justify-center gap-2 px-5 py-2.5 w-full sm:w-auto rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold transition-colors shadow-[0_0_20px_rgba(79,70,229,0.3)] border border-indigo-500/50">
                        <Plus className="w-4 h-4" />
                        Add Role
                    </button>
                </div>

            </div>
        </section>

      </div>
    </div>
  );
}
