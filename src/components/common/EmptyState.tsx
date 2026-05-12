import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  message: string;
  icon?: string;
  className?: string;
};

export function EmptyState({ message, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-lg p-10 text-center",
        className
      )}
    >
      {icon && <div className="text-3xl mb-2">{icon}</div>}
      <div className="text-sm text-muted-foreground">{message}</div>
    </div>
  );
}
