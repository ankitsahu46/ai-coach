"use client";

import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { Button } from "@/components/atoms/Button";
import { cardMotion, emptyStateMotion, wiggleAnimation, statsFadeIn, layoutSpring } from "@/lib/animations";
import { RoleCard } from "./RoleCard";
import type { Role } from "@/types";

// ============================================
// ROLE GRID — Animated grid + empty state
// ============================================

interface RoleGridProps {
  roles: Role[];
  onSelect: (role: Role) => void;
  onClearSearch: () => void;
}

export function RoleGrid({ roles, onSelect, onClearSearch }: RoleGridProps) {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
      <LayoutGroup>
        <AnimatePresence mode="popLayout">
          {roles.length > 0 ? (
            <motion.div
              key="grid"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              layout
            >
              <AnimatePresence mode="popLayout">
                {roles.map((role) => (
                  <motion.div
                    key={role.id}
                    layout
                    {...cardMotion}
                    transition={{ layout: layoutSpring }}
                  >
                    <RoleCard role={role} onSelect={onSelect} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="text-center py-20"
              {...emptyStateMotion}
            >
              <motion.span
                className="text-5xl mb-4 block"
                variants={wiggleAnimation}
                animate="animate"
              >
                🔍
              </motion.span>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No roles found
              </h3>
              <p className="text-foreground-secondary mb-6">
                Try a different search term or browse all available roles.
              </p>
              <Button
                variant="secondary"
                onClick={onClearSearch}
                id="clear-search"
              >
                Clear Search
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>

      {/* Bottom Stats */}
      <AnimatePresence>
        {roles.length > 0 && (
          <motion.div
            key="stats"
            className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-center"
            {...statsFadeIn}
          >
            <div>
              <p className="text-3xl font-bold text-primary">8+</p>
              <p className="text-sm text-muted mt-1">Career Paths</p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-border" />
            <div>
              <p className="text-3xl font-bold text-primary">200+</p>
              <p className="text-sm text-muted mt-1">Learning Topics</p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-border" />
            <div>
              <p className="text-3xl font-bold text-primary">AI</p>
              <p className="text-sm text-muted mt-1">Generated Roadmaps</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
