/**
 * Confetti + Toast — Celebration effects.
 * UI-local animation state only. No business logic.
 */

import { CheckIcon, SparkleIcon } from "./Icons";

export function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const colors = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
  const pieces = Array.from({ length: 24 }, (_, i) => ({
    id: `confetti-${i}`,
    color: colors[i % colors.length],
    left: `${10 + Math.random() * 80}%`,
    delay: `${Math.random() * 0.5}s`,
    duration: `${0.8 + Math.random() * 0.8}s`,
    size: 4 + Math.random() * 6,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {pieces.map(p => (
        <div key={p.id} className="confetti-piece"
          style={{
            left: p.left, top: "40%", backgroundColor: p.color,
            width: `${p.size}px`, height: `${p.size}px`,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            "--delay": p.delay, "--duration": p.duration,
          } as React.CSSProperties} />
      ))}
    </div>
  );
}

export function Toast({ message, visible, variant = "success" }: { message: string; visible: boolean; variant?: "success" | "info" | "skill" }) {
  if (!visible) return null;
  const styles = {
    success: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-emerald-900/20",
    info: "bg-blue-500/15 border-blue-500/30 text-blue-300 shadow-blue-900/20",
    skill: "bg-purple-500/15 border-purple-500/30 text-purple-300 shadow-purple-900/20",
  };
  return (
    <div className="fixed bottom-8 left-1/2 z-50 toast-notification" role="status" aria-live="polite">
      <div className={`flex items-center gap-2 px-5 py-3 rounded-xl border backdrop-blur-md shadow-lg ${styles[variant]}`}>
        {variant === "success" && <CheckIcon />}
        {variant === "skill" && <span>🏆</span>}
        {variant === "info" && <SparkleIcon />}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}
