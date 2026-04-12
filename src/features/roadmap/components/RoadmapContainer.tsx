"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useRoadmapGeneration } from "../hooks/useRoadmapGeneration";
import { RoadmapPage } from "./roadmap-ui/components/RoadmapPage";
import { useRole } from "@/features/role-selection";

// ============================================
// ROADMAP CONTAINER — Data Connector
// ============================================
// Bridges the headless UI module with the orchestrator hook.
// Responsibilities:
//   1. Hydration safety (mounted guard)
//   2. Persistent header (role + navigation — always visible)
//   3. Loading / error / empty fallback states
//   4. CSS scope boundary (.roadmap-ui wrapper)
//   5. Passes data + onAction to pure UI
//
// Layout structure:
//   RoadmapContainer
//    ├── PersistentHeader (always rendered — loading, error, success)
//    └── Content
//         ├── Loading  → Skeleton
//         ├── Error    → Error card
//         ├── Empty    → Empty card
//         └── Success  → <RoadmapPage />
// ============================================

// ─── Persistent Header ────────────────────────────────────────────────
// Always visible across all states. Provides context and navigation.

function PersistentHeader({
  roleName,
  roleIcon,
  onChangeRole,
}: {
  roleName: string;
  roleIcon?: string;
  onChangeRole: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto px-6 pt-6 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {roleIcon && (
            <span className="text-xl shrink-0" aria-hidden="true">
              {roleIcon}
            </span>
          )}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-200 truncate">
              {roleName}
            </h2>
            <p className="text-[11px] text-zinc-500">Learning Roadmap</p>
          </div>
        </div>
        <button
          onClick={onChangeRole}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/30 transition-all cursor-pointer shrink-0"
          aria-label="Change career role"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Change Role
        </button>
      </div>
    </div>
  );
}

// ─── Content Skeleton ─────────────────────────────────────────────────
// Rich loading experience with context, rotating status messages,
// and structured skeletons mirroring the real Topic→Subtopic→Task layout.

const LOADING_MESSAGES = [
  { text: "Analyzing your role…", icon: "🔍" },
  { text: "Mapping key skills…", icon: "🧩" },
  { text: "Building learning path…", icon: "🛤️" },
  { text: "Structuring topics…", icon: "📐" },
  { text: "Curating resources…", icon: "📚" },
  { text: "Almost there…", icon: "✨" },
];

// ── Shimmer overlay helper ──
function ShimmerBar({
  className,
  delay = 0,
}: {
  className: string;
  delay?: number;
}) {
  return (
    <div className={`${className} relative overflow-hidden`}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
          animation: `skeletonShimmer 2s ease-in-out ${delay}s infinite`,
        }}
      />
    </div>
  );
}

// ── Task Row skeleton ──
function TaskRowSkeleton({ delay }: { delay: number }) {
  return (
    <div
      className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg border-l-[3px] border-l-zinc-700/40 bg-white/[0.015]"
      style={{ animation: `fadeSlideIn 0.4s ease ${delay}s both` }}
    >
      <div className="w-2 h-2 rounded-full bg-white/[0.06] shrink-0" />
      <ShimmerBar
        className="h-3.5 bg-white/[0.04] rounded flex-1"
        delay={delay}
      />
      <ShimmerBar
        className="h-3 bg-white/[0.03] rounded w-10 shrink-0"
        delay={delay + 0.1}
      />
      <ShimmerBar
        className="h-4 bg-white/[0.03] rounded w-12 shrink-0"
        delay={delay + 0.15}
      />
    </div>
  );
}

// ── Subtopic skeleton ──
function SubtopicSkeleton({
  delay,
  taskCount,
}: {
  delay: number;
  taskCount: number;
}) {
  return (
    <div
      className="space-y-1"
      style={{ animation: `fadeSlideIn 0.4s ease ${delay}s both` }}
    >
      {/* Subtopic header */}
      <div className="flex items-center gap-3 px-1 py-2">
        <div className="w-1.5 h-1.5 rounded-full bg-white/[0.06] shrink-0" />
        <ShimmerBar
          className="h-3 bg-white/[0.05] rounded w-24"
          delay={delay}
        />
        <ShimmerBar
          className="h-2.5 bg-white/[0.03] rounded w-8 shrink-0"
          delay={delay + 0.05}
        />
        <div className="flex-1" />
        <ShimmerBar
          className="h-1 bg-white/[0.03] rounded-full w-20 shrink-0"
          delay={delay + 0.1}
        />
      </div>
      {/* Task rows */}
      <div className="space-y-1 pl-1">
        {Array.from({ length: taskCount }).map((_, j) => (
          <TaskRowSkeleton key={j} delay={delay + 0.05 + j * 0.06} />
        ))}
      </div>
    </div>
  );
}

// ── Topic card skeleton (mirrors TopicAccordion) ──
function TopicCardSkeleton({
  titleWidth,
  subtopics,
  delay,
  isFirst,
  isLast,
}: {
  titleWidth: string;
  subtopics: number[];
  delay: number;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div
      className="relative"
      style={{ animation: `fadeSlideIn 0.5s ease ${delay}s both` }}
    >
      {/* Node dot on connector */}
      <div className="absolute -left-[29px] top-6 z-10 flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-zinc-700/50 bg-zinc-800 flex items-center justify-center">
          {isFirst && (
            <div className="w-2 h-2 rounded-full bg-blue-500/40 animate-pulse" />
          )}
        </div>
      </div>

      {/* Connector line */}
      {!isLast && (
        <div
          className="absolute -left-[21px] top-11 bottom-0 w-[2px]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, #3f3f46 0px, #3f3f46 5px, transparent 5px, transparent 11px)",
          }}
        />
      )}

      <div className="rounded-xl border border-zinc-800/40 bg-[var(--color-bg-card,#131316)]">
        {/* Topic header — mirrors the accordion button */}
        <div className="flex items-center gap-4 p-4">
          {/* Progress ring skeleton */}
          <div className="w-12 h-12 rounded-full border-[3px] border-zinc-800 shrink-0 relative overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)",
                animation: `skeletonShimmer 2s ease-in-out ${delay}s infinite`,
              }}
            />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <ShimmerBar
                className="h-4 bg-white/[0.06] rounded-md"
                delay={delay + 0.1}
              />
              <ShimmerBar
                className="h-3.5 bg-white/[0.03] rounded-full w-16 shrink-0"
                delay={delay + 0.15}
              />
            </div>
            <div className="flex items-center gap-2">
              <ShimmerBar
                className="h-2.5 bg-white/[0.03] rounded w-14"
                delay={delay + 0.2}
              />
              <div className="w-px h-2.5 bg-zinc-800" />
              <ShimmerBar
                className="h-2.5 bg-white/[0.03] rounded w-10"
                delay={delay + 0.25}
              />
            </div>
            {/* Progress bar */}
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-white/[0.04]"
                style={{ width: isFirst ? "15%" : "0%" }}
              />
            </div>
          </div>
          {/* Chevron */}
          <div className="w-4 h-4 rounded bg-white/[0.02] shrink-0" />
        </div>

        {/* Expanded content: only show for the first topic */}
        {isFirst && (
          <div className="px-4 pb-4 border-t border-zinc-800/40">
            <div className="pt-3 space-y-1">
              {subtopics.map((taskCount, si) => (
                <SubtopicSkeleton
                  key={si}
                  delay={delay + 0.3 + si * 0.15}
                  taskCount={taskCount}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ContentSkeleton ──
function ContentSkeleton() {
  const [msgIndex, setMsgIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        setFade(true);
      }, 300);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const msg = LOADING_MESSAGES[msgIndex];

  return (
    <div className="max-w-4xl mx-auto px-6 pb-8">
      {/* ── Context + animated indicator ── */}
      <div className="flex flex-col items-center justify-center py-8 mb-4">
        {/* Animated orbit ring */}
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-zinc-700/40" />
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500/80 border-r-blue-400/40"
            style={{ animation: "spin 1.2s linear infinite" }}
          />
          <div
            className="absolute inset-[5px] rounded-full border-2 border-transparent border-b-violet-500/60 border-l-violet-400/30"
            style={{ animation: "spin 1.8s linear infinite reverse" }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-xl">
            <span
              key={msgIndex}
              style={{
                transition: "opacity 0.3s ease, transform 0.3s ease",
                opacity: fade ? 1 : 0,
                transform: fade ? "scale(1)" : "scale(0.7)",
              }}
            >
              {msg.icon}
            </span>
          </div>
        </div>


        {/* Rotating status */}
        <p
          className="text-[13px] font-medium text-zinc-400 h-5"
          style={{
            transition: "opacity 0.3s ease",
            opacity: fade ? 1 : 0,
          }}
        >
          {msg.text}
        </p>

        {/* Helper text */}
        <p className="text-[11px] text-zinc-600 mt-2">
          This usually takes a few seconds
        </p>
      </div>

      {/* ── Header skeleton (mirrors RoadmapHeader) ── */}
      <div className="mb-6" style={{ animation: "fadeSlideIn 0.4s ease both" }}>
        <div className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] border border-zinc-800/40">
          {/* Progress ring placeholder */}
          <div className="w-11 h-11 rounded-full border-[3px] border-zinc-800 shrink-0 relative overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)",
                animation: "skeletonShimmer 2s ease-in-out infinite",
              }}
            />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-baseline gap-2">
              <ShimmerBar
                className="h-4 bg-white/[0.06] rounded w-10"
                delay={0.1}
              />
              <ShimmerBar
                className="h-3 bg-white/[0.03] rounded w-14"
                delay={0.15}
              />
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full w-0 rounded-full" />
            </div>
          </div>
          <ShimmerBar
            className="h-8 bg-white/[0.03] rounded-lg w-24 shrink-0"
            delay={0.2}
          />
        </div>
      </div>

      {/* ── Structured roadmap skeleton: Topic→Subtopic→Task ── */}
      <div className="relative pl-10">
        <div className="absolute left-0 top-0 bottom-0 w-10" />
        <div className="space-y-3">
          {/* Topic 1 — expanded with subtopics + tasks */}
          <TopicCardSkeleton
            titleWidth="55%"
            subtopics={[3, 2]}
            delay={0.1}
            isFirst={true}
            isLast={false}
          />
          {/* Topic 2 — collapsed */}
          <TopicCardSkeleton
            titleWidth="70%"
            subtopics={[]}
            delay={0.35}
            isFirst={false}
            isLast={false}
          />
          {/* Topic 3 — collapsed */}
          <TopicCardSkeleton
            titleWidth="45%"
            subtopics={[]}
            delay={0.5}
            isFirst={false}
            isLast={true}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────

function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto px-6 mt-8">
      <div className="p-6 rounded-2xl border border-red-500/15 bg-red-500/[0.04] text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="text-red-400"
          >
            <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
            <line
              x1="12"
              y1="8"
              x2="12"
              y2="12"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="12"
              y1="16"
              x2="12.01"
              y2="16"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-red-200 mb-1">
          Couldn&apos;t Load Roadmap
        </h3>
        <p className="text-sm text-red-300/60 mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/30 transition-all cursor-pointer"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────

function EmptyState({ onChangeRole }: { onChangeRole: () => void }) {
  return (
    <div className="max-w-2xl mx-auto px-6 mt-8">
      <div className="p-8 rounded-2xl border border-zinc-700/20 bg-zinc-800/20 text-center">
        <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="text-blue-400"
          >
            <path
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-zinc-200 mb-2">
          No Roadmap Yet
        </h3>
        <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
          Your personalized learning roadmap will appear here once it&apos;s
          generated. Try selecting a role to get started.
        </p>
        <button
          onClick={onChangeRole}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600/80 hover:bg-blue-600 transition-colors cursor-pointer"
        >
          Select a Role
        </button>
      </div>
    </div>
  );
}

// ─── Main Container ───────────────────────────────────────────────────

export function RoadmapContainer() {
  // ── Hydration guard ──
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const router = useRouter();
  const { selectedRole, clearRole } = useRole();
  const { data, onAction, isLoading, error } =
    useRoadmapGeneration(selectedRole);

  const handleChangeRole = useCallback(() => {
    clearRole();
    router.push("/");
  }, [clearRole, router]);

  // Don't render anything until hydrated — avoids Next.js mismatch warnings
  if (!mounted) return null;

  // Resolve display name: prefer role store, fall back to roadmap data
  const roleName =
    selectedRole?.title || data?.title || "Your Learning Path";
  const roleIcon = selectedRole?.icon;

  return (
    <div className="roadmap-ui">
      {/* ── Persistent Header — always visible ── */}
      <PersistentHeader
        roleName={roleName}
        roleIcon={roleIcon}
        onChangeRole={handleChangeRole}
      />

      {/* ── Content area — state-dependent ── */}
      {isLoading ? (
        <ContentSkeleton />
      ) : error ? (
        <ErrorState error={error} />
      ) : !data ? (
        <EmptyState onChangeRole={handleChangeRole} />
      ) : (
        <RoadmapPage {...data} onAction={onAction} />
      )}
    </div>
  );
}
