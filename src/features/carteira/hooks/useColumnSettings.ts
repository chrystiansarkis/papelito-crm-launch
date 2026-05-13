import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CARTEIRA_COLUMN_IDS,
  DEFAULT_ORDER,
  DEFAULT_VISIBILITY,
  type CarteiraColumnId,
} from "../lib/columns";

const STORAGE_KEY = "papelito:carteira:column-settings:chrystian";

type Stored = {
  visibility: Record<CarteiraColumnId, boolean>;
  order: CarteiraColumnId[];
};

export type ColumnSettings = {
  visibility: Record<CarteiraColumnId, boolean>;
  order: CarteiraColumnId[]; // sem "cliente"
  visibleColumns: CarteiraColumnId[]; // ["cliente", ...order.filter(visible)]
  totalManageable: number;
  visibleManageableCount: number;
  toggle: (id: CarteiraColumnId) => void;
  reorder: (from: CarteiraColumnId, to: CarteiraColumnId) => void;
  reset: () => void;
};

function sanitize(raw: unknown): Stored {
  const known = new Set<CarteiraColumnId>(CARTEIRA_COLUMN_IDS);
  let order: CarteiraColumnId[] = [...DEFAULT_ORDER];
  let visibility: Record<CarteiraColumnId, boolean> = { ...DEFAULT_VISIBILITY };

  if (raw && typeof raw === "object") {
    const r = raw as Partial<Stored>;
    if (Array.isArray(r.order)) {
      const filtered = r.order.filter(
        (id): id is CarteiraColumnId =>
          typeof id === "string" && known.has(id as CarteiraColumnId) && id !== "cliente",
      );
      const seen = new Set(filtered);
      // append qualquer coluna nova que ainda não estava no payload salvo
      for (const id of DEFAULT_ORDER) if (!seen.has(id)) filtered.push(id);
      order = filtered;
    }
    if (r.visibility && typeof r.visibility === "object") {
      for (const id of CARTEIRA_COLUMN_IDS) {
        const v = (r.visibility as Record<string, unknown>)[id];
        if (typeof v === "boolean") visibility[id] = v;
      }
    }
  }
  // cliente sempre visível
  visibility.cliente = true;
  return { visibility, order };
}

function loadInitial(): Stored {
  if (typeof window === "undefined") {
    return { visibility: { ...DEFAULT_VISIBILITY }, order: [...DEFAULT_ORDER] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { visibility: { ...DEFAULT_VISIBILITY }, order: [...DEFAULT_ORDER] };
    return sanitize(JSON.parse(raw));
  } catch {
    return { visibility: { ...DEFAULT_VISIBILITY }, order: [...DEFAULT_ORDER] };
  }
}

export function useColumnSettings(): ColumnSettings {
  const [state, setState] = useState<Stored>(loadInitial);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // ignora QuotaExceeded etc; é só preferência de UI
      }
    }, 200);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [state]);

  const toggle = useCallback((id: CarteiraColumnId) => {
    if (id === "cliente") return;
    setState((s) => ({
      ...s,
      visibility: { ...s.visibility, [id]: !s.visibility[id] },
    }));
  }, []);

  const reorder = useCallback((from: CarteiraColumnId, to: CarteiraColumnId) => {
    if (from === to || from === "cliente" || to === "cliente") return;
    setState((s) => {
      const fromIdx = s.order.indexOf(from);
      const toIdx = s.order.indexOf(to);
      if (fromIdx < 0 || toIdx < 0) return s;
      const next = [...s.order];
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, from);
      return { ...s, order: next };
    });
  }, []);

  const reset = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* noop */
      }
    }
    setState({ visibility: { ...DEFAULT_VISIBILITY }, order: [...DEFAULT_ORDER] });
  }, []);

  const visibleColumns = useMemo<CarteiraColumnId[]>(
    () => ["cliente", ...state.order.filter((id) => state.visibility[id])],
    [state.order, state.visibility],
  );

  const visibleManageableCount = useMemo(
    () => state.order.filter((id) => state.visibility[id]).length,
    [state.order, state.visibility],
  );

  return {
    visibility: state.visibility,
    order: state.order,
    visibleColumns,
    totalManageable: DEFAULT_ORDER.length,
    visibleManageableCount,
    toggle,
    reorder,
    reset,
  };
}