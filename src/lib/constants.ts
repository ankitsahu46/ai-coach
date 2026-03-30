import type { Difficulty } from "@/types";
import type { BadgeVariant } from "@/components/atoms/Badge";

// ============================================
// APP CONSTANTS — Single source of truth
// ============================================

/** Centralized route definitions — never hardcode route strings */
export const APP_ROUTES = {
  home: "/",
  roadmap: "/roadmap",
} as const;

/** Maps difficulty levels to badge color variants (used by RoleCard, RoadmapPage, etc.) */
export const DIFFICULTY_BADGE_VARIANT: Record<Difficulty, BadgeVariant> = {
  beginner: "primary",
  intermediate: "secondary",
  advanced: "accent",
} as const;

/** localStorage keys — prevents typo-based bugs */
export const STORAGE_KEYS = {
  selectedRole: "career-coach:selected-role",
} as const;

/** App branding */
export const APP_NAME = "AI Career Coach";
