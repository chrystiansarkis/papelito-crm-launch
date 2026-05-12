import { cn } from "@/lib/utils";

export type SectionCardProps = {
  title: string;
  subtitle?: string | null;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function SectionCard({
  title,
  subtitle,
  right,
  children,
  className,
  bodyClassName,
}: SectionCardProps) {
  return (
    <div className={cn("border border-border rounded-lg bg-card overflow-hidden", className)}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        {right}
      </div>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </div>
  );
}
