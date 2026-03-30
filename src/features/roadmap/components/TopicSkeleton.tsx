import { Card } from "@/components/atoms/Card";

// ============================================
// TOPIC SKELETON
// Exactly matches the layout padding and font height of real topics
// to prevent Layout Shift (CLS) during load.
// ============================================

export function TopicSkeleton() {
  return (
    <Card variant="default" className="animate-pulse">
      <div className="p-6 flex flex-col md:flex-row gap-6 items-start">
        {/* Number Circle Skeleton */}
        <div className="w-8 h-8 rounded-full bg-primary/5 shrink-0" />

        <div className="flex-1 w-full">
          {/* Title Skeleton */}
          <div className="h-6 bg-border/40 rounded w-1/3 mb-4" />

          {/* Description Mocks (simulate multi-line text) */}
          <div className="space-y-2 mb-6">
            <div className="h-4 bg-border/30 rounded w-full" />
            <div className="h-4 bg-border/20 rounded w-5/6" />
          </div>

          {/* Badges row skeleton */}
          <div className="flex items-center gap-4">
            <div className="h-5 bg-border/30 rounded-full w-24" />
            <div className="h-4 bg-border/20 rounded w-16" />
          </div>
        </div>

        {/* Action Button Skeleton */}
        <div className="shrink-0 mt-4 md:mt-0 w-full md:w-auto">
          <div className="h-8 bg-border/40 rounded w-full md:w-32" />
        </div>
      </div>
    </Card>
  );
}
