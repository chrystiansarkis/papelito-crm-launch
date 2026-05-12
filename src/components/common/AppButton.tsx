// Botão alinhado ao Figma Make. Renomeado para AppButton para não conflitar
// com o Button do shadcn em src/components/ui/button.tsx.
import { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppButtonVariant = "primary" | "brand" | "secondary" | "link";

export interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant;
  children: ReactNode;
}

export function AppButton({
  variant = "primary",
  children,
  disabled,
  className,
  ...props
}: AppButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-md font-medium transition-all duration-200";

  const variants: Record<AppButtonVariant, string> = {
    primary: disabled
      ? "bg-gray-text text-white cursor-not-allowed"
      : "bg-ink text-white hover:bg-ink-soft active:bg-ink",
    brand: disabled
      ? "bg-gray-text text-white cursor-not-allowed"
      : "bg-brand text-ink font-semibold hover:bg-[#E5B814] active:bg-brand-deep",
    secondary: disabled
      ? "bg-white border border-gray-line text-gray-text cursor-not-allowed"
      : "bg-white border border-gray-line text-ink hover:border-ink-soft hover:bg-gray-soft/30 active:bg-gray-soft",
    link: disabled
      ? "text-gray-text cursor-not-allowed"
      : "text-ink hover:text-ink-soft underline-offset-4 hover:underline",
  };

  if (variant === "link") {
    return (
      <button
        className={cn(base, variants.link, "px-0", className)}
        disabled={disabled}
        {...props}
      >
        {children}
        {!disabled && <ArrowRight className="w-4 h-4" strokeWidth={1.8} />}
      </button>
    );
  }

  return (
    <button
      className={cn(base, variants[variant], className)}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
