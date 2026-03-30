// ============================================
// ANIMATION PRESETS — Named motion configs
// ============================================
// Centralizes all framer-motion animation values.
// Components reference these presets instead of
// inlining raw spring/transition configs in JSX.
// ============================================

import type { Transition, Variants } from "motion/react";

/** Default spring for layout reflows (grid repositioning) */
export const layoutSpring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

/** Snappy spring for card/element entry */
export const entrySpring: Transition = {
  type: "spring",
  stiffness: 350,
  damping: 28,
  mass: 0.8,
};

/** Standard spring for page-level sections */
export const sectionSpring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 25,
};

/** Fast ease-in for exit animations */
export const exitTransition: Transition = {
  duration: 0.2,
  ease: "easeIn",
};

/** Fade + slide up for page sections */
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: sectionSpring,
} as const;

/** Card enter/exit/layout animation set */
export const cardMotion = {
  initial: { opacity: 0, scale: 0.85, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: entrySpring,
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: -10,
    transition: exitTransition,
  },
  transition: { layout: layoutSpring },
} as const;

/** Empty state animation */
export const emptyStateMotion = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: sectionSpring,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.15 },
  },
} as const;

/** Wiggle keyframes (for empty state emoji) */
export const wiggleAnimation: Variants = {
  animate: {
    rotate: [0, -10, 10, -10, 0],
    transition: {
      duration: 0.6,
      delay: 0.2,
      ease: "easeInOut",
    },
  },
};

/** Stats section fade-in */
export const statsFadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: { duration: 0.4, delay: 0.3 },
} as const;
