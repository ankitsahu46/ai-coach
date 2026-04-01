"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

// ============================================
// AUTH SESSION PROVIDER
// ============================================
// Client-side wrapper for NextAuth's SessionProvider.
// Enables useSession() hook across all client components.
//
// Placed here (not inline in layout) to maintain the
// providers/ convention established by AppProviders.
// ============================================

interface AuthSessionProviderProps {
  children: ReactNode;
}

export function AuthSessionProvider({ children }: AuthSessionProviderProps) {
  return <SessionProvider>{children}</SessionProvider>;
}
