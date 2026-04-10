"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useRole } from "@/features/role-selection/hooks/useRole";
import { useRoadmapGeneration } from "../hooks/useRoadmapGeneration";
import { TopicSkeleton } from "./TopicSkeleton";
import { Button } from "@/components/atoms/Button";
import { Card } from "@/components/atoms/Card";
import { Badge } from "@/components/atoms/Badge";
import { ClockIcon, ClipboardIcon, BoltIcon } from "@/components/icons";
import { PageHeader } from "@/components/layout/PageHeader";
import { DIFFICULTY_BADGE_VARIANT, APP_ROUTES } from "@/lib/constants";
import { fadeInUp } from "@/lib/animations";
import type { Topic, Subtopic, Task, TaskState } from "../types";

// ============================================
// ROADMAP PAGE — Hierarchical Accordion UI
// ============================================
// Renders: Topic (accordion) → Subtopic (section) → Task (row)
// All task state derived via selectors — NO shared-logic imports.
// Actions dispatched via hook's handleTaskAction.
//
// Production hardening:
//   - Buttons disabled while task action is in-flight (spam prevention)
//   - Toast feedback on success/failure (via hook)
//   - Visual state mapping for all task states
//   - Skeleton loading for initial roadmap generation
//   - Empty + error states with CTAs
// ============================================

// ── Visual state mapping ──
const STATE_STYLES: Record<TaskState, { bg: string; text: string; border: string; icon: string }> = {
  completed: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    icon: "✅",
  },
  available: {
    bg: "bg-primary/5",
    text: "text-foreground",
    border: "border-border",
    icon: "🔓",
  },
  locked: {
    bg: "bg-background-secondary/50",
    text: "text-muted/60",
    border: "border-border/30",
    icon: "🔒",
  },
  skipped: {
    bg: "bg-zinc-500/5",
    text: "text-muted",
    border: "border-zinc-500/20",
    icon: "⏭",
  },
};

// ── Task Row Component ──
function TaskRow({
  task,
  state,
  isRecommended,
  isBusy,
  onAction,
}: {
  task: Task;
  state: TaskState;
  isRecommended: boolean;
  isBusy: boolean;
  onAction: (taskId: string, action: "complete" | "skip" | "uncomplete" | "unskip") => void;
}) {
  const styles = STATE_STYLES[state];
  const isLocked = state === "locked";

  return (
    <motion.div
      id={`task-${task.id}`}
      layout
      initial={false}
      animate={{ scale: state === "completed" ? 1.02 : 1, opacity: 1 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${styles.bg} ${styles.border} ${isLocked ? "opacity-60" : "hover:border-primary/30"} ${isRecommended ? "ring-1 ring-primary/40 shadow-sm shadow-primary/10" : ""}`}
      aria-busy={isBusy}
      tabIndex={isLocked ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (state === "available") onAction(task.id, "complete");
          else if (state === "completed") onAction(task.id, "uncomplete");
          else if (state === "skipped") onAction(task.id, "unskip");
        }
      }}
    >
      {/* State icon — show spinner when busy */}
      <span className="text-sm shrink-0" aria-hidden="true">
        {isBusy ? (
          <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          styles.icon
        )}
      </span>

      {/* Task info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${styles.text}`}>
            {task.title}
          </span>
          {isRecommended && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 shrink-0">
              Next
            </span>
          )}
          {task.isOptional && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 shrink-0">
              Optional
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-muted capitalize">{task.type}</span>
          <span className="text-xs text-muted/60">⏱ {task.estimatedTime}</span>
        </div>
      </div>

      {/* Action buttons — disabled when in-flight */}
      <div className="flex items-center gap-1.5 shrink-0">
        {state === "available" && (
          <>
            <button
              onClick={() => onAction(task.id, "complete")}
              disabled={isBusy}
              aria-disabled={isBusy}
              aria-busy={isBusy}
              className="px-3 py-1 text-xs font-medium rounded-md bg-primary text-black hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBusy ? "Saving..." : "Complete"}
            </button>
            {task.isSkippable && (
              <button
                onClick={() => onAction(task.id, "skip")}
                disabled={isBusy}
                aria-disabled={isBusy}
                className="px-3 py-1 text-xs font-medium rounded-md border border-border text-muted hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Skip
              </button>
            )}
          </>
        )}
        {state === "completed" && (
          <button
            onClick={() => onAction(task.id, "uncomplete")}
            disabled={isBusy}
            aria-disabled={isBusy}
            aria-busy={isBusy}
            className="px-3 py-1 text-xs font-medium rounded-md border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBusy ? "Saving..." : "Undo"}
          </button>
        )}
        {state === "skipped" && (
          <button
            onClick={() => onAction(task.id, "unskip")}
            disabled={isBusy}
            aria-disabled={isBusy}
            aria-busy={isBusy}
            className="px-3 py-1 text-xs font-medium rounded-md border border-zinc-500/30 text-muted hover:text-foreground hover:border-primary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBusy ? "Saving..." : "Unskip"}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Subtopic Section ──
function SubtopicSection({
  subtopic,
  taskStates,
  inFlightTasks,
  recommendedTaskId,
  onAction,
}: {
  subtopic: Subtopic;
  taskStates: Map<string, TaskState>;
  inFlightTasks: Set<string>;
  recommendedTaskId: string | null;
  onAction: (taskId: string, action: "complete" | "skip" | "uncomplete" | "unskip") => void;
}) {
  return (
    <div className="space-y-2">
      {/* Subtopic header */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted/70">
          {subtopic.title}
        </span>
        {subtopic.type !== "core" && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20 capitalize">
            {subtopic.type}
          </span>
        )}
      </div>

      {/* Task rows */}
      <div className="space-y-1.5">
        {subtopic.tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            state={taskStates.get(task.id) ?? "locked"}
            isRecommended={task.id === recommendedTaskId}
            isBusy={inFlightTasks.has(task.id)}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
}

// ── Topic Accordion ──
function TopicAccordion({
  topic,
  index,
  taskStates,
  inFlightTasks,
  recommendedTaskId,
  onAction,
  isExpanded,
  onToggle,
}: {
  topic: Topic;
  index: number;
  taskStates: Map<string, TaskState>;
  inFlightTasks: Set<string>;
  recommendedTaskId: string | null;
  onAction: (taskId: string, action: "complete" | "skip" | "uncomplete" | "unskip") => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Compute topic progress from task states
  let totalTasks = 0;
  let completedTasks = 0;
  for (const sub of topic.subtopics) {
    for (const task of sub.tasks) {
      totalTasks++;
      if (taskStates.get(task.id) === "completed") completedTasks++;
    }
  }
  const topicPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const isTopicDone = totalTasks > 0 && completedTasks === totalTasks;

  return (
    <Card
      id={`topic-${topic.id}`}
      variant="default"
      padding="none"
      className={`transition-colors duration-200 ${isTopicDone ? "border-emerald-500/30" : "hover:border-primary/40"}`}
    >
      {/* Accordion header */}
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center gap-4 text-left group cursor-pointer"
        aria-expanded={isExpanded}
      >
        {/* Number badge */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
            isTopicDone
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-primary/10 text-primary"
          }`}
        >
          {isTopicDone ? "✓" : index + 1}
        </div>

        {/* Topic info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-foreground truncate">
              {topic.title}
            </h3>
            <Badge variant={DIFFICULTY_BADGE_VARIANT[topic.difficulty]}>
              {topic.difficulty}
            </Badge>
            {topic.isOptional && (
              <Badge variant="outline">Optional</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <ClockIcon className="w-3 h-3" /> {topic.estimatedTime}
            </span>
            <span>{completedTasks}/{totalTasks} tasks</span>
            <span className="font-semibold text-primary">{topicPercentage}%</span>
          </div>
        </div>

        {/* Progress bar (mini) */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <div className="w-24 h-1.5 bg-background-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${isTopicDone ? "bg-emerald-500" : "bg-primary"}`}
              style={{ width: `${topicPercentage}%`, transition: "width 300ms ease" }}
            />
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-muted transition-transform duration-200 shrink-0 ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Accordion body */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-border/50 pt-4">
              {/* Topic description */}
              <p className="text-sm text-foreground-secondary leading-relaxed">
                {topic.description}
              </p>

              {/* Subtopics → Tasks */}
              {topic.subtopics.map((subtopic) => (
                <SubtopicSection
                  key={subtopic.id}
                  subtopic={subtopic}
                  taskStates={taskStates}
                  inFlightTasks={inFlightTasks}
                  recommendedTaskId={recommendedTaskId}
                  onAction={onAction}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Task Skeleton (for inside accordions during partial loads) ──
function TaskSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border/30 bg-background-secondary/30 animate-pulse">
      <div className="w-4 h-4 rounded-full bg-border/40 shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-3.5 bg-border/40 rounded w-2/3" />
        <div className="h-2.5 bg-border/30 rounded w-1/3" />
      </div>
      <div className="h-6 w-16 bg-border/30 rounded shrink-0" />
    </div>
  );
}

// ============================================
// MAIN ROADMAP PAGE
// ============================================

export function RoadmapPage() {
  const { selectedRole, isHydrated, clearRole } = useRole();
  const {
    roadmapData,
    stats,
    nextTask,
    taskStates,
    inFlightTasks,
    isLoading,
    isDelayedUX,
    error,
    retryGenerate,
    handleTaskAction,
  } = useRoadmapGeneration(selectedRole);
  const router = useRouter();

  // Track which topics are expanded
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const toggleTopic = useCallback((topicId: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  }, []);

  // Auto-expand the topic containing the recommended task
  useEffect(() => {
    if (nextTask && roadmapData) {
      for (const topic of roadmapData.topics) {
        for (const sub of topic.subtopics) {
          if (sub.tasks.some((t) => t.id === nextTask.id)) {
            setExpandedTopics((prev) => {
              if (prev.has(topic.id)) return prev;
              return new Set(prev).add(topic.id);
            });
            return;
          }
        }
      }
    }
  }, [nextTask?.id, roadmapData?.topics]);

  // Redirect to home if no role selected (after hydration)
  useEffect(() => {
    if (isHydrated && !selectedRole) {
      router.replace(APP_ROUTES.home);
    }
  }, [isHydrated, selectedRole, router]);

  // Handle auto-scrolling to a specific topic/task if requested via URL hash
  useEffect(() => {
    if (!isLoading && roadmapData && typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash && (hash.startsWith("#topic-") || hash.startsWith("#task-"))) {
        const timer = setTimeout(() => {
          // If targeting a task, also expand its parent topic
          if (hash.startsWith("#task-")) {
            const taskId = hash.slice(6);
            for (const topic of roadmapData.topics) {
              for (const sub of topic.subtopics) {
                if (sub.tasks.some((t) => t.id === taskId)) {
                  setExpandedTopics((prev) => new Set(prev).add(topic.id));
                  break;
                }
              }
            }
          }

          // Small extra delay to allow accordion expansion
          setTimeout(() => {
            const element = document.querySelector(hash);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "center" });
              element.classList.add("border-primary", "shadow-[0_0_30px_-5px_rgba(0,255,100,0.3)]");
              setTimeout(() => {
                element.classList.remove("border-primary", "shadow-[0_0_30px_-5px_rgba(0,255,100,0.3)]");
              }, 2000);
              window.history.replaceState(null, "", window.location.pathname + window.location.search);
            }
          }, 300);
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, roadmapData?.isFallback]);

  // Loading state while hydrating from localStorage
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted">Loading your roadmap...</p>
        </div>
      </div>
    );
  }

  // Guard — will redirect above, but prevents flash
  if (!selectedRole) {
    return null;
  }

  const handleChangeRole = () => {
    clearRole();
    router.push(APP_ROUTES.home);
  };

  const recommendedTaskId = nextTask?.id ?? null;

  return (
    <>
      <PageHeader backLabel="Change Role" onBack={handleChangeRole} />

      {/* Role Summary Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <motion.div {...fadeInUp}>
          <Card variant="glass" padding="lg">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Icon */}
              <span className="text-5xl" role="img" aria-label={selectedRole.title}>
                {selectedRole.icon}
              </span>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    {selectedRole.title}
                  </h1>
                  <Badge variant={DIFFICULTY_BADGE_VARIANT[selectedRole.difficulty]}>
                    {selectedRole.difficulty}
                  </Badge>
                </div>
                <p className="text-foreground-secondary leading-relaxed">
                  {selectedRole.description}
                </p>
                <div className="flex items-center gap-6 mt-4 text-sm text-muted">
                  <div className="flex items-center gap-1.5">
                    <ClockIcon />
                    <span>{selectedRole.estimatedWeeks} weeks</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ClipboardIcon />
                    <span>{selectedRole.topicCount} topics</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 self-start">
                <Button variant="outline" size="sm" onClick={handleChangeRole}>
                  Change Role
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Roadmap Content */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {isLoading && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-10 mb-4 space-y-3 animate-in fade-in transition-all">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2" />
              <h3 className="text-xl font-medium text-foreground">Generating Your Roadmap...</h3>
              <p className="text-muted text-sm flex items-center gap-2">
                <BoltIcon /> AI is customizing a learning path for {selectedRole.title}.
              </p>
              {isDelayedUX && (
                <p className="text-warning text-sm font-medium animate-pulse mt-2">
                  Still generating... structuring the optimal topic progression...
                </p>
              )}
            </div>
            
            {/* Skeleton placeholders — match real accordion layout */}
            {Array.from({ length: 5 }).map((_, i) => (
              <TopicSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        )}

        {error && !isLoading && (
          <Card variant="default" className="border-red-500/20 bg-red-500/5">
            <div className="p-8 text-center flex flex-col items-center">
              <span className="text-4xl block mb-4">⚠️</span>
              <h3 className="text-xl font-semibold text-red-500 mb-2">Generation Failed</h3>
              <p className="text-red-400/80 max-w-md mb-6">{error}</p>
              <Button onClick={retryGenerate} variant="outline" size="sm">
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {(!roadmapData || roadmapData.topics.length === 0) && !isLoading && !error && (
          <Card variant="default" className="border-border/60 border-dashed bg-background-secondary/50">
            <div className="p-16 text-center flex flex-col items-center">
              <span className="text-5xl block mb-4 opacity-70">📭</span>
              <h3 className="text-xl font-semibold text-foreground mb-2">No roadmap found</h3>
              <p className="text-muted max-w-sm mx-auto mb-8">
                We couldn't locate a generated roadmap for <span className="text-foreground font-medium">{selectedRole.title}</span>. Let's create one now.
              </p>
              <Button onClick={retryGenerate} variant="primary">
                Generate Roadmap
                <BoltIcon />
              </Button>
            </div>
          </Card>
        )}

        {roadmapData && roadmapData.topics.length > 0 && !isLoading && (
          <div className="space-y-4">
            {roadmapData.isFallback && (
              <div className="mb-6 rounded-md bg-warning/10 border border-warning/20 p-4 flex items-start gap-3">
                <span className="text-warning text-lg">⚠️</span>
                <div>
                  <h4 className="text-warning font-semibold text-sm">Using Basic Roadmap</h4>
                  <p className="text-warning/80 text-sm mt-0.5">
                    The AI generation service is currently unavailable. Enjoy this standard foundational curriculum so you can keep executing safely!
                  </p>
                </div>
              </div>
            )}

            {/* Summary bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-semibold">Your Learning Path</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium text-muted">{roadmapData.topics.length} Modules</span>
                  <span className="w-1 h-1 bg-border rounded-full" />
                  <span className="text-sm font-medium text-muted">{stats.total} Tasks</span>
                  <span className="w-1 h-1 bg-border rounded-full" />
                  <span className="text-sm font-bold text-primary">{stats.completed} Completed ({stats.percentage}%)</span>
                </div>
              </div>
              
              <div className="w-full md:w-48 h-2.5 bg-background-secondary rounded-full overflow-hidden border border-border/50">
                <div 
                  className="h-full bg-primary transition-all duration-700 ease-out"
                  style={{ width: `${stats.percentage}%` }}
                />
              </div>
            </div>

            {/* Topic accordions */}
            {roadmapData.topics.map((topic, index) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
              >
                <TopicAccordion
                  topic={topic}
                  index={index}
                  taskStates={taskStates}
                  inFlightTasks={inFlightTasks}
                  recommendedTaskId={recommendedTaskId}
                  onAction={handleTaskAction}
                  isExpanded={expandedTopics.has(topic.id)}
                  onToggle={() => toggleTopic(topic.id)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
