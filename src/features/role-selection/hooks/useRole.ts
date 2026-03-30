"use client";

import { useContext } from "react";
import { RoleContext, type RoleContextValue } from "../context/RoleContext";

// ============================================
// useRole Hook — Clean API to access role state
// ============================================

/**
 * Access the selected role state from anywhere in the app.
 *
 * @example
 * ```tsx
 * const { selectedRole, selectRole, clearRole } = useRole();
 * ```
 *
 * @throws Error if used outside of RoleProvider
 */
export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);

  if (context === undefined) {
    throw new Error(
      "useRole() must be used within a <RoleProvider>. " +
        "Wrap your component tree with <RoleProvider> in the root layout."
    );
  }

  return context;
}
