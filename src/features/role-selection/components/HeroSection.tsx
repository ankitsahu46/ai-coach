import { Input } from "@/components/atoms/Input";
import { SearchIcon } from "@/components/icons";

// ============================================
// HERO SECTION — Landing banner + search
// ============================================

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function HeroSection({ searchQuery, onSearchChange }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-12 md:pt-28 md:pb-16">
        {/* Pill Badge */}
        <div className="flex justify-center mb-6 animate-fade-in">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-muted px-4 py-1.5 text-sm font-medium text-primary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            AI-Powered Career Roadmaps
          </span>
        </div>

        {/* Heading */}
        <h1 className="text-center text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight animate-fade-in-up">
          <span className="text-foreground">Choose Your </span>
          <span className="text-primary">Career Path</span>
        </h1>

        {/* Subtitle */}
        <p
          className="mt-5 text-center text-lg md:text-xl text-foreground-secondary max-w-2xl mx-auto leading-relaxed animate-fade-in-up"
          style={{ animationDelay: "100ms" }}
        >
          Select a role and let AI generate a personalized learning roadmap.
          Track your progress, stay consistent, and level up.
        </p>

        {/* Search Bar */}
        <div className="mt-10 max-w-md mx-auto animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          <Input
            placeholder="Search roles (e.g. Frontend, AI, Cloud...)"
            icon={<SearchIcon />}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            id="role-search"
            aria-label="Search career roles"
          />
        </div>
      </div>
    </section>
  );
}
