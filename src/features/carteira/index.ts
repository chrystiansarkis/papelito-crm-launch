export { GlobalBar } from "./components/GlobalBar";
export { ViewToggle, type ViewMode } from "./components/ViewToggle";
export { SubFilters } from "./components/SubFilters";
export { PreFilterChips, type PreFilter } from "./components/PreFilterChips";
export { BulkActionBar } from "./components/BulkActionBar";
export { ClientList } from "./components/ClientList";
export { KanbanView } from "./components/KanbanView";
export { MapView } from "./components/MapView";
export {
  useCarteiraKpis,
  useCarteiraVendedores,
  useCarteiraClientes,
} from "./hooks/useCarteira";
export type { CarteiraCliente, CarteiraFiltro, CarteiraKpis as CarteiraKpisData } from "./types";
export { CARTEIRA_PAGE_SIZE } from "./types";
