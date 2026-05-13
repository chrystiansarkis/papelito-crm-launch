// Wrapper específico da carteira sobre o columnSettings genérico em shared/.
import { useMemo } from "react";
import { useColumnSettings as useShared } from "@/features/shared/columnSettings";
import type { ColumnSettingsState } from "@/features/shared/columnSettings";
import {
  CARTEIRA_COLUMN_IDS,
  DEFAULT_ORDER,
  DEFAULT_VISIBILITY,
  type CarteiraColumnId,
} from "../lib/columns";

const STORAGE_KEY = "papelito:carteira:column-settings:chrystian";

export type ColumnSettings = ColumnSettingsState<CarteiraColumnId>;

export function useColumnSettings(): ColumnSettings {
  const cfg = useMemo(
    () => ({
      storageKey: STORAGE_KEY,
      allIds: CARTEIRA_COLUMN_IDS,
      fixedTop: ["cliente"] as CarteiraColumnId[],
      defaultOrder: DEFAULT_ORDER,
      defaultVisibility: DEFAULT_VISIBILITY,
    }),
    [],
  );
  return useShared<CarteiraColumnId>(cfg);
}
