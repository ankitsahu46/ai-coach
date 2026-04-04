import type { BadgeVariant } from "@/components/atoms/Badge";

// ============================================
// APP CONSTANTS — Single source of truth
// ============================================

/** Centralized route definitions — never hardcode route strings */
export const APP_ROUTES = {
  home: "/",
  roadmap: "/roadmap",
} as const;

/** Maps difficulty levels to badge color variants (supports both casings) */
export const DIFFICULTY_BADGE_VARIANT: Record<string, BadgeVariant> = {
  // Lowercase (global types)
  beginner: "primary",
  intermediate: "secondary",
  advanced: "accent",
  // PascalCase (AI/Zod schema — L-08 fix)
  Beginner: "primary",
  Intermediate: "secondary",
  Advanced: "accent",
} as const;

/** localStorage keys — prevents typo-based bugs */
export const STORAGE_KEYS = {
  selectedRole: "career-coach:selected-role",
} as const;

/** App branding */
export const APP_NAME = "AI Career Coach";
