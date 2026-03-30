"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/features/role-selection/hooks/useRole";
import { roles } from "@/features/role-selection/data/roles";
import { APP_ROUTES } from "@/lib/constants";
import { HeroSection } from "./HeroSection";
import { RoleGrid } from "./RoleGrid";
import type { Role } from "@/types";

// ============================================
// ROLE SELECTION PAGE — Thin orchestrator
// ============================================
// Coordinates sub-components without owning
// any rendering or animation logic itself.
//
// Sub-components:
//   HeroSection — banner + search input
//   RoleGrid   — animated card grid + empty state + stats
//   RoleCard   — individual role display (used by RoleGrid)
// ============================================

export function RoleSelectionPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { selectedRole, selectRole, isHydrated } = useRole();
  const router = useRouter();

  // 7. Navigation Memory UX Polish: Skip selection if user returns and already holds a role
  useEffect(() => {
    if (isHydrated && selectedRole) {
      router.replace(APP_ROUTES.roadmap);
    }
  }, [isHydrated, selectedRole, router]);

  const handleSelectRole = (role: Role) => {
    selectRole(role);
    router.push(APP_ROUTES.roadmap);
  };

  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    const q = searchQuery.toLowerCase();
    return roles.filter(
      (role) =>
        role.title.toLowerCase().includes(q) ||
        role.description.toLowerCase().includes(q) ||
        role.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <>
      <HeroSection
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <RoleGrid
        roles={filteredRoles}
        onSelect={handleSelectRole}
        onClearSearch={() => setSearchQuery("")}
      />
    </>
  );
}
