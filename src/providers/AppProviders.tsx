"use client";

import type { ReactNode } from "react";
import { AuthSessionProvider } from "@/providers/AuthSessionProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { RoleProvider } from "@/features/role-selection/context/RoleContext";

// ============================================
// APP PROVIDERS — Unified provider wrapper
// ============================================
// Wraps all context providers in one component.
// The root layout imports only this — it never needs
// to know about individual feature providers.
//
// Provider order (outermost → innermost):
//   1. AuthSessionProvider — enables useSession() everywhere
//   2. ThemeProvider       — dark/light mode
//   3. RoleProvider        — selected career role state
// ============================================

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <AuthSessionProvider>
      <ThemeProvider>
        <RoleProvider>{children}</RoleProvider>
      </ThemeProvider>
    </AuthSessionProvider>
  );
}
