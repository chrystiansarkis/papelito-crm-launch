// Badge usado pelos itens da Sidebar. Renomeado para NavBadge para não conflitar
// com o Badge do shadcn em src/components/ui/badge.tsx.
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type NavBadgeVariant = "default" | "alert" | "brand";

const VARIANTS: Record<NavBadgeVariant, string> = {
  default: "bg-gray-text text-white",
  alert: "bg-bad text-white",
  brand: "bg-brand text-brand-deep",
};

export function NavBadge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: NavBadgeVariant;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10.5px] font-semibold tabular",
        VARIANTS[variant]
      )}
    >
      {children}
    </span>
  );
}
