"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { RoleProvider } from "@/features/role-selection/context/RoleContext";

// ============================================
// APP PROVIDERS — Unified provider wrapper
// ============================================
// Wraps all context providers in one component.
// The root layout imports only this — it never needs
// to know about individual feature providers.
//
// To add a new provider (e.g. AuthProvider):
//   1. Import it here
//   2. Nest it in the tree below
//   3. Root layout stays unchanged
// ============================================

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <RoleProvider>{children}</RoleProvider>
    </ThemeProvider>
  );
}
