export { CarteiraKpis } from "./components/CarteiraKpis";
export { CarteiraFiltros } from "./components/CarteiraFiltros";
export { CarteiraTable } from "./components/CarteiraTable";
export {
  useCarteiraKpis,
  useCarteiraVendedores,
  useCarteiraClientes,
} from "./hooks/useCarteira";
export type { CarteiraCliente, CarteiraFiltro, CarteiraKpis as CarteiraKpisData } from "./types";
export { CARTEIRA_PAGE_SIZE } from "./types";
