// Mitigates: A10 (mascara erros do Postgres/Supabase; nunca exibe error.message cru ao usuário)
import { cn } from "@/lib/utils";

export type ErrorStateProps = {
  message?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  message = "Não foi possível carregar os dados. Tente novamente.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "bg-card border border-red-200 rounded-lg p-6 text-center space-y-3",
        className
      )}
    >
      <div className="text-sm text-red-700">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 border border-border rounded-lg text-sm hover:bg-muted"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
