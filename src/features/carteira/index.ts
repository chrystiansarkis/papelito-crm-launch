export { GlobalBar } from "./components/GlobalBar";
export { ViewToggle, type ViewMode } from "./components/ViewToggle";
export { SubFilters } from "./components/SubFilters";
export { PreFilterChips, type PreFilter } from "./components/PreFilterChips";
export { BulkActionBar } from "./components/BulkActionBar";
export { ClientList } from "./components/ClientList";
export { ColumnSettings } from "./components/ColumnSettings";
export { useColumnSettings } from "./hooks/useColumnSettings";
export { useTableSort, type SortState, type SortDirection } from "./hooks/useTableSort";
export type { CarteiraColumnId } from "./lib/columns";
export { KanbanView } from "./components/KanbanView";
export { MapView } from "./components/MapView";
export {
  useCarteiraKpis,
  useCarteiraVendedores,
  useCarteiraClientes,
  useCarteiraKpiClientes,
} from "./hooks/useCarteira";
export { CarteiraKpisHeader } from "./components/kpis/CarteiraKpisHeader";
export { useCadastrarCliente, type CadastroEtapa, type CadastrarClienteResult } from "./hooks/useCadastrarCliente";
export { useForcarSyncProtheus } from "./hooks/useForcarSyncProtheus";
export { useVendedoresProtheus } from "./hooks/useVendedoresProtheus";
export { useTabelasPreco } from "./hooks/useTabelasPreco";
export { useUfs, useCidades, useMatrizSearch } from "./hooks/useLookups";
export { SearchSelect } from "./components/SearchSelect";
export { ClienteFormView, type ClienteFormViewProps, type Errors as ClienteFormErrors } from "./components/ClienteFormView";
export {
  getCadastroCliente,
  type CadastroClienteResult,
  type CadastroOrigem,
} from "./api/getCadastroCliente";
export { useCadastroCliente } from "./hooks/useCadastroCliente";
export type { UfOption, CidadeOption, MatrizOption } from "./api/lookups";
export type { VendedorProtheusOption } from "./api/listVendedoresProtheus";
export type { TabelaPrecoOption } from "./api/listTabelasPreco";
export type { ProtheusSyncResult } from "./api/protheus";
export {
  novoClienteSchema,
  NOVO_CLIENTE_INITIAL,
  CONTATO_INITIAL,
  ENDERECO_INITIAL,
  TIPO_CONTA_VALUES,
  TIPO_PESSOA_VALUES,
  TIPO_PROTHEUS_VALUES,
  TIPO_PROTHEUS_LABEL,
  SEGMENTO_VALUES,
  FUNCAO_CONTATO_VALUES,
  FUNCAO_CONTATO_LABEL,
  type Contato,
  type Endereco,
  type NovoClienteForm,
} from "./schemas.cadastro";
export type { CarteiraCliente, CarteiraFiltro, CarteiraKpis as CarteiraKpisData, ClienteKpi } from "./types";
export { CARTEIRA_PAGE_SIZE } from "./types";
