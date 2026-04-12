/**
 * RoadmapPage — Composition Root
 *
 * ★ This is the ONLY file the main project imports.
 * ★ It receives ALL data as props (ViewModels from selectors).
 * ★ It has ZERO business logic.
 * ★ It composes child components and passes props down.
 *
 * Main project usage:
 *   const { data, onAction } = useRoadmapGeneration();
 *   <RoadmapPage {...data} onAction={onAction} />
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type { RoadmapPageProps, RoadmapAction } from "../types";
import { RoadmapHeader } from "./RoadmapHeader";
import { MomentumBanner } from "./MomentumBanner";
import { ContinueLearningBar } from "./ContinueLearningBar";
import { WeeklySummary } from "./WeeklySummary";
import { DailyPlanBar } from "./DailyPlanBar";
import { TopicAccordion } from "./TopicAccordion";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { FocusMode } from "./FocusMode";
import { Confetti, Toast } from "./Confetti";

const DEFAULT_FEATURES = {
  focusMode: true,
  weeklySummary: true,
  dailyPlan: true,
  momentumBanner: true,
  streakWidget: true,
  continueBar: true,
};

export function RoadmapPage(props: RoadmapPageProps) {
  const {
    title,
    topics,
    progress,
    dailyPlan,
    momentum,
    weeklySummary,
    streak,
    lastTask,
    selectedTask,
    focusTask,
    recommendedTaskId,
    isUpdatingTaskIds,
    showConfetti,
    toast,
    onAction,
    features: featureFlags,
  } = props;

  const features = { ...DEFAULT_FEATURES, ...featureFlags };

  // ── UI-local state ──
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(() => {
    if (!recommendedTaskId) return new Set<string>();
    for (const topic of topics) {
      for (const sub of topic.subtopics) {
        if (sub.tasks.some(t => t.id === recommendedTaskId)) {
          return new Set([topic.id]);
        }
      }
    }
    return new Set<string>();
  });

  // UI-local error toast (for ActionResult errors)
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [showErrorToast, setShowErrorToast] = useState(false);

  // Auto-scroll to recommended on mount
  const hasAutoScrolled = useRef(false);
  useEffect(() => {
    if (hasAutoScrolled.current) return;
    hasAutoScrolled.current = true;
    const timer = setTimeout(() => {
      const el = document.getElementById("recommended-task");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  /**
   * 4.1 — Error UI Toast Wiring
   * Every action result is checked. If it fails, show an error toast.
   */
  const handleAction = useCallback(async (action: RoadmapAction) => {
    // Scroll-to-recommended is UI-local — handle without delegating
    if (action.type === "scroll-to-recommended") {
      if (recommendedTaskId) {
        for (const topic of topics) {
          for (const sub of topic.subtopics) {
            if (sub.tasks.some(t => t.id === recommendedTaskId)) {
              setExpandedTopics(prev => new Set([...prev, topic.id]));
              break;
            }
          }
        }
      }
      setTimeout(() => {
        const el = document.getElementById("recommended-task");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.add("ring-1", "ring-blue-400/30");
          setTimeout(() => el.classList.remove("ring-1", "ring-blue-400/30"), 1200);
        }
      }, 350);
      return { success: true };
    }

    // Delegate all other actions to main project, then check result
    const result = await onAction(action);

    // 4.1 — Wire errors to toast
    if (!result.success && result.error) {
      setErrorToast(result.error);
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
    }

    return result;
  }, [onAction, recommendedTaskId, topics]);

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  return (
    // 4.5 — CSS Isolation: .roadmap-ui scope wrapper
    <div className="roadmap-ui min-h-screen bg-[var(--color-bg-main)] roadmap-grid">
      <main className="max-w-4xl mx-auto px-6 py-8">

        <RoadmapHeader
          title={title}
          progress={progress}
          streak={streak}
          recommendedTaskId={recommendedTaskId}
          onAction={handleAction}
        />

        {features.momentumBanner && <MomentumBanner momentum={momentum} />}

        {features.continueBar && (
          <ContinueLearningBar lastTask={lastTask} onAction={handleAction} />
        )}

        {features.weeklySummary && weeklySummary && <WeeklySummary data={weeklySummary} />}

        {features.dailyPlan && dailyPlan && <DailyPlanBar plan={dailyPlan} onAction={handleAction} />}

        {/* Learning Journey */}
        <div className="relative pl-10">
          <div className="absolute left-0 top-0 bottom-0 w-10" />
          <div className="space-y-3">
            {topics.map((topic, index) => (
              <TopicAccordion
                key={topic.id}
                topic={topic}
                isExpanded={expandedTopics.has(topic.id)}
                onToggle={() => toggleTopic(topic.id)}
                isLast={index === topics.length - 1}
                onAction={handleAction}
                isUpdatingTaskIds={isUpdatingTaskIds}
                recommendedTaskId={recommendedTaskId}
              />
            ))}
          </div>
        </div>

        <footer className="mt-12 pt-5 border-t border-zinc-800/50 text-center">
          <p className="text-[10px] text-zinc-700">
            {title} · AI Career Coach
          </p>
        </footer>
      </main>

      {/* Slide-over Panel — pass loading set for disable */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onAction={handleAction}
          isLoading={isUpdatingTaskIds.has(selectedTask.id)}
        />
      )}

      {/* Focus Mode */}
      {features.focusMode && focusTask && (
        <FocusMode
          task={focusTask}
          onAction={handleAction}
          isLoading={isUpdatingTaskIds.has(focusTask.id)}
        />
      )}

      <Confetti active={showConfetti} />

      {/* Main project toast */}
      {toast && <Toast message={toast.message} visible={toast.visible} variant={toast.variant} />}

      {/* 4.1 — Error toast (UI-local, from ActionResult failures) */}
      {showErrorToast && errorToast && (
        <Toast message={`⚠️ ${errorToast}`} visible={showErrorToast} variant="info" />
      )}
    </div>
  );
}
