"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@/components/icons";

// ============================================
// THEME TOGGLE — Light/Dark mode switch
// ============================================
// Classified as a "molecule" (not an atom) because it
// contains business logic: reading theme state from
// next-themes and managing a hydration-safe mount guard.
// ============================================

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        className="h-9 w-9 rounded-lg border border-border bg-card"
        aria-label="Toggle theme"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative h-9 w-9 rounded-lg border border-border bg-card hover:bg-card-hover transition-all duration-200 flex items-center justify-center cursor-pointer group"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      id="theme-toggle"
    >
      <SunIcon
        className={`h-4 w-4 transition-all duration-300 absolute ${
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "rotate-90 scale-0 opacity-0"
        }`}
      />
      <MoonIcon
        className={`h-4 w-4 transition-all duration-300 absolute ${
          !isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
}
