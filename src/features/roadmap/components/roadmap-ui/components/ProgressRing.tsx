/**
 * ProgressRing — Circular progress indicator.
 * Pure UI. No logic. Receives progress via props.
 */

export function ProgressRing({ progress, size = 48, strokeWidth = 4 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  const getColor = () => {
    if (progress === 100) return "#22c55e";
    if (progress >= 50) return "#3b82f6";
    if (progress > 0) return "#f59e0b";
    return "#3f3f46";
  };

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#27272a" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={getColor()} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        className="transition-all duration-700 ease-out" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="rotate-90 origin-center" fill="#e4e4e7" fontSize={size < 40 ? "9" : "11"}
        fontWeight="600" fontFamily="Inter, sans-serif">
        {progress}%
      </text>
    </svg>
  );
}
