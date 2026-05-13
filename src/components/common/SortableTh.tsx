// Mitigates: A05 (a coluna ordenável é tipada e validada num zod enum lá no
// schema do filtro, antes de virar query — este componente só dispara o
// callback com a key, sem montar SQL).
//
// Cabeçalho clicável para tabelas. Renderiza setinha conforme o estado atual
// de ordenação. Toggle: asc -> desc -> asc.
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";

export type SortState<K extends string> = {
  by: K;
  dir: SortDir;
};

export function SortableTh<K extends string>({
  column,
  sort,
  onSort,
  children,
  align = "left",
  className,
}: {
  column: K;
  sort: SortState<K> | null;
  onSort: (column: K) => void;
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const active = sort?.by === column;
  const dir = active ? sort?.dir : null;

  return (
    <th
      className={cn(
        "px-3 py-2.5 label-caps text-gray-text select-none",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-ink transition-colors group",
          active && "text-ink",
        )}
        aria-label={`Ordenar por ${typeof children === "string" ? children : column}`}
        aria-sort={!active ? "none" : dir === "asc" ? "ascending" : "descending"}
      >
        <span>{children}</span>
        {dir === "asc" ? (
          <ArrowUp className="w-3 h-3" strokeWidth={2.5} />
        ) : dir === "desc" ? (
          <ArrowDown className="w-3 h-3" strokeWidth={2.5} />
        ) : (
          <ChevronsUpDown className="w-3 h-3 opacity-40 group-hover:opacity-80" strokeWidth={2} />
        )}
      </button>
    </th>
  );
}
