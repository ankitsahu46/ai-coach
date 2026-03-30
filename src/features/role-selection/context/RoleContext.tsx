"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Role } from "@/types";
import { STORAGE_KEYS } from "@/lib/constants";

// ============================================
// ROLE CONTEXT — Stores selected career role
// ============================================
// Architecture decision:
//   Context + localStorage hybrid.
//   - Context: provides reactive state across components (triggers re-renders)
//   - localStorage: persists the selection across page refreshes
//   - No external state library needed for this scope
// ============================================

export interface RoleContextValue {
  /** The currently selected role, or null if none selected */
  selectedRole: Role | null;
  /** Select a role and persist it */
  selectRole: (role: Role) => void;
  /** Clear the selected role */
  clearRole: () => void;
  /** Whether the context has finished hydrating from localStorage */
  isHydrated: boolean;
}

export const RoleContext = createContext<RoleContextValue | undefined>(
  undefined
);

interface RoleProviderProps {
  children: ReactNode;
}

export function RoleProvider({ children }: RoleProviderProps) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.selectedRole);
      if (stored) {
        const parsed: Role = JSON.parse(stored);
        setSelectedRole(parsed);
      }
    } catch {
      // Corrupted data — clear it silently
      localStorage.removeItem(STORAGE_KEYS.selectedRole);
    }
    setIsHydrated(true);
  }, []);

  const selectRole = useCallback((role: Role) => {
    setSelectedRole(role);
    try {
      localStorage.setItem(STORAGE_KEYS.selectedRole, JSON.stringify(role));
    } catch {
      // Storage full or unavailable — state still works in-memory
    }
  }, []);

  const clearRole = useCallback(() => {
    setSelectedRole(null);
    try {
      localStorage.removeItem(STORAGE_KEYS.selectedRole);
    } catch {
      // Silent fail
    }
  }, []);

  return (
    <RoleContext.Provider
      value={{ selectedRole, selectRole, clearRole, isHydrated }}
    >
      {children}
    </RoleContext.Provider>
  );
}
