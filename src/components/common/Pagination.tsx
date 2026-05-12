export type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
};

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between">
      <div className="text-xs text-muted-foreground">
        Página {page + 1} de {totalPages} ({total.toLocaleString("pt-BR")} resultados)
      </div>
      <div className="flex gap-2">
        <button
          disabled={page === 0}
          onClick={() => onChange(Math.max(0, page - 1))}
          className="px-3 py-1.5 border border-border rounded-lg text-sm disabled:opacity-40 hover:bg-muted"
        >
          Anterior
        </button>
        <button
          disabled={page >= totalPages - 1}
          onClick={() => onChange(page + 1)}
          className="px-3 py-1.5 border border-border rounded-lg text-sm disabled:opacity-40 hover:bg-muted"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
