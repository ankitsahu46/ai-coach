"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { LayoutDashboard, LogIn, LogOut, Loader2, User, Mail, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function AuthMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status === "loading") {
    return (
      <div className="h-10 px-4 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-sm backdrop-blur-md">
        <Loader2 size={16} className="text-white/40 animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium border border-white/10 shadow-sm backdrop-blur-md transition-colors"
      >
        <LogIn size={16} />
        <span>Sign In</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-medium border border-blue-500/20 shadow-sm backdrop-blur-md transition-colors"
      >
        <LayoutDashboard size={16} />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>
      
      <div className="relative" ref={menuRef}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-white/5 border transition-colors ${
            isOpen ? "bg-white/5 border-white/20" : "border-transparent"
          }`}
          title="Account menu"
        >
          {session?.user?.image ? (
            <img 
              src={session.user.image} 
              alt={session.user.name || "Profile picture"} 
              className="w-8 h-8 rounded-full border border-white/10 shadow-sm object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 shadow-sm flex items-center justify-center text-white/50">
              <User size={14} />
            </div>
          )}
          <ChevronDown size={14} className="text-white/50" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0f1115] border border-white/10 shadow-2xl overflow-hidden backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
              <p className="font-medium text-white truncate">
                {session?.user?.name || "User"}
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-sm text-white/50">
                <Mail size={14} className="shrink-0" />
                <span className="truncate">{session?.user?.email}</span>
              </div>
            </div>
            
            <div className="p-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // TARGETED WIPE: Clear sensitive cached user data without touching Theme preferences
                  for (const key of Object.keys(localStorage)) {
                    if (
                      key.startsWith("roadmap:") ||
                      key.startsWith("migration_done_") ||
                      key.startsWith("career-coach:")
                    ) {
                      localStorage.removeItem(key);
                    }
                  }
                  signOut({ callbackUrl: "/" });
                }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-red-500/10 text-white/70 hover:text-red-400 transition-colors text-sm font-medium"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
