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
export { useCadastrarCliente } from "./hooks/useCadastrarCliente";
export { useUfs, useCidades, useMatrizSearch } from "./hooks/useLookups";
export { SearchSelect } from "./components/SearchSelect";
export type { UfOption, CidadeOption, MatrizOption } from "./api/lookups";
export {
  novoClienteSchema,
  NOVO_CLIENTE_INITIAL,
  CONTATO_INITIAL,
  ENDERECO_INITIAL,
  TIPO_CONTA_VALUES,
  TIPO_PESSOA_VALUES,
  SEGMENTO_VALUES,
  FUNCAO_CONTATO_VALUES,
  FUNCAO_CONTATO_LABEL,
  type Contato,
  type Endereco,
  type NovoClienteForm,
} from "./schemas.cadastro";
export type { CarteiraCliente, CarteiraFiltro, CarteiraKpis as CarteiraKpisData } from "./types";
export { CARTEIRA_PAGE_SIZE } from "./types";
