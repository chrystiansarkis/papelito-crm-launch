import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChipVariant = "default" | "active" | "saved";

const VARIANTS: Record<ChipVariant, string> = {
  default: "bg-white border border-gray-line text-ink hover:border-ink-soft",
  active: "bg-ink border border-ink text-white",
  saved:
    "bg-brand-soft border border-[#F5E599] text-brand-deep hover:border-brand",
};

export type ChipProps = {
  children: ReactNode;
  variant?: ChipVariant;
  hasDropdown?: boolean;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
};

export function Chip({
  children,
  variant = "default",
  hasDropdown = false,
  onClick,
  className,
  type = "button",
}: ChipProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 cursor-pointer select-none",
        VARIANTS[variant],
        className
      )}
    >
      {children}
      {hasDropdown && (
        <ChevronDown className="w-3.5 h-3.5 ml-0.5" strokeWidth={1.8} />
      )}
    </button>
  );
}
