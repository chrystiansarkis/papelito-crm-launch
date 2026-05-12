import { cn } from "@/lib/utils";
import type { StatusKind } from "./Pill";

const COLORS: Record<StatusKind, string> = {
  healthy: "bg-good",
  warn: "bg-warn",
  risk: "bg-bad",
  missing: "bg-gray-text",
};

export function StatusDot({
  status,
  size = 8,
  className,
}: {
  status: StatusKind;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block rounded-full shrink-0", COLORS[status], className)}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}
