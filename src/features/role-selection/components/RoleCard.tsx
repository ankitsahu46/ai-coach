import { Card } from "@/components/atoms/Card";
import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { ClockIcon, ClipboardIcon, ArrowRightIcon } from "@/components/icons";
import { DIFFICULTY_BADGE_VARIANT } from "@/lib/constants";
import type { Role } from "@/types";

// ============================================
// ROLE CARD — Single career role display
// ============================================

interface RoleCardProps {
  role: Role;
  onSelect: (role: Role) => void;
}

export function RoleCard({ role, onSelect }: RoleCardProps) {
  return (
    <Card
      variant="interactive"
      padding="none"
      className="group overflow-hidden h-full"
    >
      <div className="p-6 flex flex-col h-full">
        {/* Icon + Badge Row */}
        <div className="flex items-start justify-between mb-4">
          <span
            className="text-4xl block transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
            role="img"
            aria-label={role.title}
          >
            {role.icon}
          </span>
          <Badge variant={DIFFICULTY_BADGE_VARIANT[role.difficulty]}>
            {role.difficulty}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-200">
          {role.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-foreground-secondary mb-5 leading-relaxed flex-1">
          {role.description}
        </p>

        {/* Meta Row */}
        <div className="flex items-center gap-4 mb-5 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <ClockIcon className="w-3.5 h-3.5" />
            <span>{role.estimatedWeeks} weeks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ClipboardIcon className="w-3.5 h-3.5" />
            <span>{role.topicCount} topics</span>
          </div>
        </div>

        {/* CTA */}
        <Button
          variant="primary"
          size="md"
          fullWidth
          className="opacity-90 group-hover:opacity-100 transition-opacity"
          id={`start-${role.slug}`}
          onClick={() => onSelect(role)}
        >
          Start Journey
          <ArrowRightIcon className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Button>
      </div>
    </Card>
  );
}
