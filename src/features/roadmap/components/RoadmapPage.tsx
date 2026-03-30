"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useRole } from "@/features/role-selection/hooks/useRole";
import { useRoadmapGeneration } from "../hooks/useRoadmapGeneration";
import { TopicSkeleton } from "./TopicSkeleton";
import { Button } from "@/components/atoms/Button";
import { Card } from "@/components/atoms/Card";
import { Badge } from "@/components/atoms/Badge";
import { ClockIcon, ClipboardIcon, BoltIcon } from "@/components/icons";
import { PageHeader } from "@/components/layout/PageHeader";
import { DIFFICULTY_BADGE_VARIANT, APP_ROUTES } from "@/lib/constants";
import { fadeInUp, sectionSpring } from "@/lib/animations";

// ============================================
// ROADMAP PAGE — Displays selected role info
// (AI-generated roadmap content comes in a future step)
// ============================================

export function RoadmapPage() {
  const { selectedRole, isHydrated, clearRole } = useRole();
  const { 
    roadmapData, 
    completedCount, 
    progressPercentage, 
    isLoading, 
    isDelayedUX, 
    error, 
    retryGenerate, 
    toggleTopicCompletion 
  } = useRoadmapGeneration(selectedRole);
  const router = useRouter();

  // Redirect to home if no role selected (after hydration)
  useEffect(() => {
    if (isHydrated && !selectedRole) {
      router.replace(APP_ROUTES.home);
    }
  }, [isHydrated, selectedRole, router]);

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
            
            {/* 5 Exact-height Skeleton Placeholders */}
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
                Try Again
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

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-semibold">Your Learning Path</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-medium text-muted">{roadmapData.topics.length} Modules</span>
                  <span className="w-1 h-1 bg-border rounded-full" />
                  <span className="text-sm font-bold text-primary">{completedCount} Completed ({progressPercentage}%)</span>
                </div>
              </div>
              
              <div className="w-full md:w-48 h-2.5 bg-background-secondary rounded-full overflow-hidden border border-border/50">
                <div 
                  className="h-full bg-primary transition-all duration-700 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
            
            {roadmapData.topics.map((topic, index) => (
              <Card key={topic.id} variant="default" className="hover:border-primary/50 transition-colors">
                <div className="p-6 flex flex-col md:flex-row gap-6 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">{topic.title}</h3>
                    </div>
                    <p className="text-foreground-secondary mb-4 leading-relaxed">
                      {topic.description}
                    </p>
                    <div className="flex items-center gap-4">
                      <Badge variant={DIFFICULTY_BADGE_VARIANT[topic.difficulty.toLowerCase() as keyof typeof DIFFICULTY_BADGE_VARIANT]}>
                        {topic.difficulty}
                      </Badge>
                      <span className="text-sm text-muted flex items-center gap-1.5">
                        <ClockIcon /> {topic.estimatedTime}
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress Tracking */}
                  <div className="shrink-0 mt-4 md:mt-0 w-full md:w-auto">
                    <Button 
                      variant={topic.completed ? "primary" : "outline"} 
                      size="sm" 
                      className="w-full"
                      onClick={() => toggleTopicCompletion(topic.id)}
                    >
                      {topic.completed ? "Completed" : "Mark Complete"}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
