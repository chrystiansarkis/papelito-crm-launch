import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ColumnSettingsConfig<TId extends string> = {
  storageKey: string;
  // Todas as colunas conhecidas (inclui as fixedTop).
  allIds: TId[];
  // Colunas sempre visíveis e na primeira(s) posição(ões). Não vão pro popover.
  fixedTop: TId[];
  // Ordem default das colunas manipuláveis (sem as fixedTop).
  defaultOrder: TId[];
  // Visibilidade default por id (inclui fixedTop = true).
  defaultVisibility: Record<TId, boolean>;
};

type Stored<TId extends string> = {
  visibility: Record<TId, boolean>;
  order: TId[];
};

export type ColumnSettings<TId extends string> = {
  visibility: Record<TId, boolean>;
  order: TId[]; // só manipuláveis
  visibleColumns: TId[]; // [...fixedTop, ...order.filter(visible)]
  totalManageable: number;
  visibleManageableCount: number;
  toggle: (id: TId) => void;
  reorder: (from: TId, to: TId) => void;
  reset: () => void;
};

function sanitize<TId extends string>(
  raw: unknown,
  cfg: ColumnSettingsConfig<TId>,
): Stored<TId> {
  const known = new Set<TId>(cfg.allIds);
  const fixedSet = new Set<TId>(cfg.fixedTop);
  let order: TId[] = [...cfg.defaultOrder];
  const visibility: Record<TId, boolean> = { ...cfg.defaultVisibility };

  if (raw && typeof raw === "object") {
    const r = raw as Partial<Stored<TId>>;
    if (Array.isArray(r.order)) {
      const filtered = r.order.filter(
        (id): id is TId =>
          typeof id === "string" && known.has(id as TId) && !fixedSet.has(id as TId),
      );
      const seen = new Set(filtered);
      for (const id of cfg.defaultOrder) if (!seen.has(id)) filtered.push(id);
      order = filtered;
    }
    if (r.visibility && typeof r.visibility === "object") {
      for (const id of cfg.allIds) {
        const v = (r.visibility as Record<string, unknown>)[id];
        if (typeof v === "boolean") visibility[id] = v;
      }
    }
  }
  for (const id of cfg.fixedTop) visibility[id] = true;
  return { visibility, order };
}

function loadInitial<TId extends string>(cfg: ColumnSettingsConfig<TId>): Stored<TId> {
  if (typeof window === "undefined") {
    return {
      visibility: { ...cfg.defaultVisibility },
      order: [...cfg.defaultOrder],
    };
  }
  try {
    const raw = window.localStorage.getItem(cfg.storageKey);
    if (!raw) {
      return {
        visibility: { ...cfg.defaultVisibility },
        order: [...cfg.defaultOrder],
      };
    }
    return sanitize(JSON.parse(raw), cfg);
  } catch {
    return {
      visibility: { ...cfg.defaultVisibility },
      order: [...cfg.defaultOrder],
    };
  }
}

export function useColumnSettings<TId extends string>(
  cfg: ColumnSettingsConfig<TId>,
): ColumnSettings<TId> {
  const [state, setState] = useState<Stored<TId>>(() => loadInitial(cfg));
  const timer = useRef<number | null>(null);
  const fixedSet = useMemo(() => new Set(cfg.fixedTop), [cfg.fixedTop]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(cfg.storageKey, JSON.stringify(state));
      } catch {
        // ignora
      }
    }, 200);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [state, cfg.storageKey]);

  const toggle = useCallback(
    (id: TId) => {
      if (fixedSet.has(id)) return;
      setState((s) => ({
        ...s,
        visibility: { ...s.visibility, [id]: !s.visibility[id] },
      }));
    },
    [fixedSet],
  );

  const reorder = useCallback(
    (from: TId, to: TId) => {
      if (from === to || fixedSet.has(from) || fixedSet.has(to)) return;
      setState((s) => {
        const fromIdx = s.order.indexOf(from);
        const toIdx = s.order.indexOf(to);
        if (fromIdx < 0 || toIdx < 0) return s;
        const next = [...s.order];
        next.splice(fromIdx, 1);
        next.splice(toIdx, 0, from);
        return { ...s, order: next };
      });
    },
    [fixedSet],
  );

  const reset = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(cfg.storageKey);
      } catch {
        /* noop */
      }
    }
    setState({
      visibility: { ...cfg.defaultVisibility },
      order: [...cfg.defaultOrder],
    });
  }, [cfg.defaultOrder, cfg.defaultVisibility, cfg.storageKey]);

  const visibleColumns = useMemo<TId[]>(
    () => [...cfg.fixedTop, ...state.order.filter((id) => state.visibility[id])],
    [cfg.fixedTop, state.order, state.visibility],
  );

  const visibleManageableCount = useMemo(
    () => state.order.filter((id) => state.visibility[id]).length,
    [state.order, state.visibility],
  );

  return {
    visibility: state.visibility,
    order: state.order,
    visibleColumns,
    totalManageable: cfg.defaultOrder.length,
    visibleManageableCount,
    toggle,
    reorder,
    reset,
  };
}