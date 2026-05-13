// Mitigates: A05 (todo valor que vem da URL é re-validado pelo zod antes de
//            virar GlobalFilters; chaves desconhecidas são ignoradas)
//
// useGlobalFilters: hook que persiste filtros globais nos query params da URL.
// Compartilhado entre Carteira e Pedidos — navegar entre as páginas mantém o
// recorte (vendedor, UF, etc.). Reset = remover do query string.
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { globalFiltersSchema } from "./schema";
import { INITIAL_GLOBAL_FILTERS, type GlobalFilters } from "./types";

const STORED_KEYS = Object.keys(INITIAL_GLOBAL_FILTERS) as (keyof GlobalFilters)[];

function readFromParams(params: URLSearchParams): GlobalFilters {
  const obj: Record<string, string> = {};
  for (const k of STORED_KEYS) {
    const v = params.get(k);
    if (v != null) obj[k] = v;
  }
  // safeParse: input inválido cai no default ("") em vez de quebrar a tela
  const parsed = globalFiltersSchema.safeParse(obj);
  return parsed.success ? (parsed.data as GlobalFilters) : INITIAL_GLOBAL_FILTERS;
}

export function useGlobalFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<GlobalFilters>(() => readFromParams(params), [params]);

  const setFilter = useCallback(
    <K extends keyof GlobalFilters>(key: K, value: GlobalFilters[K]) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value === "" || value == null) next.delete(key);
          else next.set(key, String(value));
          // Quando trocar qualquer filtro, removemos pagina das listas para
          // não ficar em página vazia. As páginas usam state local de page.
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const patch = useCallback(
    (delta: Partial<GlobalFilters>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(delta)) {
            if (v === "" || v == null) next.delete(k);
            else next.set(k, String(v));
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const reset = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const k of STORED_KEYS) next.delete(k);
        return next;
      },
      { replace: true },
    );
  }, [setParams]);

  return { filters, setFilter, patch, reset };
}
