import { cn } from "@/lib/utils";

export type SparkVariant = "good" | "bad" | "neutral";

const COLORS: Record<SparkVariant, string> = {
  good: "bg-good",
  bad: "bg-bad",
  neutral: "bg-gray-text",
};

export function Sparkbar({
  data,
  variant = "neutral",
  maxHeight = 24,
  className,
}: {
  data: number[];
  variant?: SparkVariant;
  maxHeight?: number;
  className?: string;
}) {
  if (data.length === 0) {
    return <span className="text-gray-text text-xs">—</span>;
  }
  const max = Math.max(...data, 1);
  return (
    <div
      className={cn("inline-flex items-end gap-1", className)}
      style={{ height: `${maxHeight}px` }}
    >
      {data.map((v, i) => {
        const isLast = i === data.length - 1;
        const pct = Math.max((v / max) * 100, 4);
        return (
          <div
            key={i}
            className={cn(
              "w-1.5 rounded-sm",
              COLORS[variant],
              isLast ? "opacity-100" : "opacity-30"
            )}
            style={{ height: `${pct}%` }}
          />
        );
      })}
    </div>
  );
}

export function Sparkline({
  data,
  variant = "neutral",
  height = 24,
  className,
}: {
  data: number[];
  variant?: SparkVariant;
  height?: number;
  className?: string;
}) {
  if (data.length === 0) {
    return <span className="text-gray-text text-xs">—</span>;
  }
  const max = Math.max(...data, 1);
  return (
    <div
      className={cn("inline-flex items-end gap-0.5", className)}
      style={{ height: `${height}px` }}
    >
      {data.map((v, i) => {
        const isLast = i === data.length - 1;
        const pct = Math.max((v / max) * 100, 4);
        return (
          <div
            key={i}
            className={cn(
              "w-1 rounded-sm",
              COLORS[variant],
              isLast ? "opacity-100" : "opacity-40"
            )}
            style={{ height: `${pct}%` }}
          />
        );
      })}
    </div>
  );
}
