import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { clienteKeys } from "./queryKeys";
import { listGrupoDisplayNomes } from "../api/listGrupoDisplayNomes";

const ONE_HOUR = 60 * 60 * 1000;

export function useGrupoDisplayNomes() {
  const q = useQuery({
    queryKey: clienteKeys.grupoDisplayNomes(),
    queryFn: listGrupoDisplayNomes,
    staleTime: ONE_HOUR,
  });

  // Mapa case-insensitive: chave UPPER(nome_original) → nome_amigavel.
  const map = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of q.data ?? []) {
      m.set(row.nome_original.toUpperCase().trim(), row.nome_amigavel);
    }
    return m;
  }, [q.data]);

  return { ...q, displayMap: map };
}

export function applyDisplayNome(
  raw: string,
  map: Map<string, string> | undefined,
): string {
  if (!map) return raw;
  return map.get(raw.toUpperCase().trim()) ?? raw;
}