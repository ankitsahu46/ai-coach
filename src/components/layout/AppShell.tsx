"use client";

import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/molecules/ThemeToggle";

// ============================================
// APP SHELL — Shared page wrapper
// ============================================
// Provides consistent page structure:
//   - Floating ThemeToggle (top-right)
//   - Full-height background
//   - Semantic <main> wrapper
//
// Every route page wraps its content in AppShell
// so the toggle and base styles are never duplicated.
// ============================================

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Floating Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <main>{children}</main>
    </div>
  );
}
