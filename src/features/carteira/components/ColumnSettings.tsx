// Wrapper da carteira sobre o ColumnSettings genérico em shared/.
import { ColumnSettings as Shared } from "@/features/shared/columnSettings";
import { COLUMN_LABEL, type CarteiraColumnId } from "../lib/columns";
import type { ColumnSettings as ColumnSettingsState } from "../hooks/useColumnSettings";

export function ColumnSettings({ settings }: { settings: ColumnSettingsState }) {
  return (
    <Shared<CarteiraColumnId>
      settings={settings}
      labels={COLUMN_LABEL}
      fixedTop={["cliente"]}
    />
  );
}
