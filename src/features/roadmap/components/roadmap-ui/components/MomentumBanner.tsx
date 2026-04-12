/**
 * MomentumBanner — Contextual encouragement banner.
 * Receives the pre-computed message from selector. No logic.
 */

import type { MomentumView } from "../types";

export function MomentumBanner({ momentum }: { momentum: MomentumView | null }) {
  if (!momentum) return null;

  return (
    <div className="mb-3 momentum-banner" role="status" aria-live="polite">
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500/[0.06] to-orange-500/[0.04] border border-amber-500/10">
        <span className="text-sm">{momentum.emoji}</span>
        <span className="text-xs font-medium text-amber-300/90">{momentum.message}</span>
        <span className="text-[10px] text-zinc-600 ml-auto">{momentum.taskCount} task{momentum.taskCount !== 1 ? "s" : ""} today</span>
      </div>
    </div>
  );
}
