"use client";

import { useSession, signIn, signOut } from "next-auth/react";

/**
 * AUTH DEBUG COMPONENT
 * 
 * Purpose: Confirm Checkpoint 3 (session.user.id availability)
 * - Shows your sync status
 * - Displays the MongoDB _id from the custom session
 * - Provides quick Sign In / Sign Out buttons
 */
export function AuthDebug() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 rounded-xl border border-border bg-card/80 backdrop-blur-md shadow-2xl max-w-sm">
      <div className="flex flex-col gap-3 text-xs font-mono">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground uppercase tracking-widest text-[10px]">AUTH STATUS</span>
          <span className={`px-2 py-0.5 rounded-full ${status === "authenticated" ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
            {status.toUpperCase()}
          </span>
        </div>

        {session ? (
          <>
            <div className="space-y-1">
              <p className="text-muted-foreground">USER ID (MONGODB):</p>
              <p className="p-1.5 rounded bg-black/20 text-white truncate text-[11px] border border-white/5">
                {session.user.id || "❌ MISSING ID"}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-muted-foreground">EMAIL:</p>
              <p className="truncate text-white">{session.user.email}</p>
            </div>

            <button 
              onClick={() => signOut()}
              className="mt-2 w-full py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors border border-red-500/20"
            >
              Sign Out
            </button>
          </>
        ) : (
          <button 
            onClick={() => signIn("google")}
            className="mt-2 w-full py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors border border-primary/20"
          >
            Sign In with Google
          </button>
        )}
      </div>
    </div>
  );
}
