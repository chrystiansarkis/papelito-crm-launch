import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PillVariant =
  | "solid"
  | "soft"
  | "outline"
  | "healthy"
  | "warn"
  | "risk"
  | "missing";

const VARIANTS: Record<PillVariant, string> = {
  solid: "bg-ink text-white",
  soft: "bg-gray-soft text-ink-soft",
  outline: "bg-white border border-gray-line text-ink",
  healthy: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  risk: "bg-bad-soft text-bad",
  missing: "bg-gray-soft text-gray-text",
};

export function Pill({
  children,
  variant = "solid",
  className,
}: {
  children: ReactNode;
  variant?: PillVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap",
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export type StatusKind = "healthy" | "warn" | "risk" | "missing";

const STATUS_LABEL: Record<StatusKind, string> = {
  healthy: "Saudável",
  warn: "Atenção",
  risk: "Em risco",
  missing: "Sumido",
};

export function StatusPill({ status }: { status: StatusKind }) {
  return <Pill variant={status}>{STATUS_LABEL[status]}</Pill>;
}
