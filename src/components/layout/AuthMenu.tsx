"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { LayoutDashboard, LogIn, LogOut, Loader2 } from "lucide-react";

export function AuthMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-sm backdrop-blur-md">
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
        <span>Dashboard</span>
      </Link>
      
      <button
        onClick={() => {
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
        className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-500/10 flex items-center justify-center text-white/70 hover:text-red-400 border border-white/10 shadow-sm backdrop-blur-md transition-colors"
        title="Sign Out"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
