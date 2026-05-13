import { useCallback, useState } from "react";
import type { CarteiraColumnId } from "../lib/columns";

export type SortDirection = "asc" | "desc";
export type SortState = {
  sortBy: CarteiraColumnId | null;
  direction: SortDirection | null;
};

const INITIAL: SortState = { sortBy: null, direction: null };

export function useTableSort() {
  const [sort, setSort] = useState<SortState>(INITIAL);

  // Ciclo: null → asc → desc → null
  const toggle = useCallback((id: CarteiraColumnId) => {
    setSort((prev) => {
      if (prev.sortBy !== id) return { sortBy: id, direction: "asc" };
      if (prev.direction === "asc") return { sortBy: id, direction: "desc" };
      return INITIAL;
    });
  }, []);

  const reset = useCallback(() => setSort(INITIAL), []);

  return { sort, toggle, reset };
}

export type UseTableSort = ReturnType<typeof useTableSort>;