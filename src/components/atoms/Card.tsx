import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ============================================
// CARD ATOM
// ============================================

export type CardVariant = "default" | "interactive" | "glass";

interface CardProps extends ComponentPropsWithoutRef<"div"> {
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg";
  header?: ReactNode;
  footer?: ReactNode;
}

const paddingStyles: Record<NonNullable<CardProps["padding"]>, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "default",
      padding = "md",
      header,
      footer,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base
          "rounded-xl border transition-all duration-300 ease-out",

          // Variant: default
          variant === "default" &&
            "bg-card border-card-border",

          // Variant: interactive — hover lift + glow
          variant === "interactive" && [
            "bg-card border-card-border cursor-pointer",
            "hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5",
            "hover:border-primary/40",
            "active:translate-y-0 active:shadow-md",
          ],

          // Variant: glass — glassmorphism
          variant === "glass" && [
            "bg-glass-bg border-glass-border",
            "backdrop-blur-xl backdrop-saturate-150",
          ],

          className
        )}
        {...props}
      >
        {header && (
          <div className="border-b border-card-border px-6 py-4">
            {header}
          </div>
        )}

        <div className={cn(paddingStyles[padding])}>
          {children}
        </div>

        {footer && (
          <div className="border-t border-card-border px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    );
  }
);

Card.displayName = "Card";
export { Card };
export type { CardProps };
