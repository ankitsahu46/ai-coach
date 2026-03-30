import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@/components/icons";
import { APP_NAME } from "@/lib/constants";

// ============================================
// PAGE HEADER — Reusable navigation header
// ============================================

interface PageHeaderProps {
  /** Back button label */
  backLabel: string;
  /** Callback when back button is clicked */
  onBack: () => void;
  /** Optional right-side content (defaults to app name) */
  trailing?: ReactNode;
}

export function PageHeader({ backLabel, onBack, trailing }: PageHeaderProps) {
  return (
    <header className="border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-foreground-secondary hover:text-primary transition-colors cursor-pointer"
          id="page-header-back"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {backLabel}
        </button>
        {trailing ?? (
          <span className="text-sm font-medium text-muted">{APP_NAME}</span>
        )}
      </div>
    </header>
  );
}
