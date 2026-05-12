import { cn } from "@/lib/utils";

export type ProgressBarVariant = "brand" | "good" | "bad" | "neutral";

const COLORS: Record<ProgressBarVariant, string> = {
  brand: "bg-brand",
  good: "bg-good",
  bad: "bg-bad",
  neutral: "bg-gray-text",
};

export function ProgressBar({
  value,
  max = 100,
  variant = "brand",
  height = 4,
  className,
}: {
  value: number;
  max?: number;
  variant?: ProgressBarVariant;
  height?: number;
  className?: string;
}) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div
      className={cn("w-full bg-gray-soft rounded-full overflow-hidden", className)}
      style={{ height: `${height}px` }}
    >
      <div
        className={cn("h-full transition-all duration-300 rounded-full", COLORS[variant])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
