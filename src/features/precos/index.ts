export { listDescontos } from "./api/listDescontos";
export { salvarDesconto } from "./api/salvarDesconto";
export { salvarDescontoLote, type DescontoLotePayload } from "./api/salvarDescontoLote";
export { removerDesconto } from "./api/removerDesconto";
export { listGruposArvore } from "./api/listGruposArvore";
export { listClientesTabela, listDescontoClientes } from "./api/listClientesTabela";
export {
  useDescontos,
  useGruposArvore,
  useSalvarDesconto,
  useRemoverDesconto,
  useClientesTabela,
  useDescontoClientes,
} from "./hooks/useDescontos";
export {
  descontoSchema,
  ESCOPOS,
  TIPOS,
  type DescontoForm,
  type DescontoRow,
  type DescontoClienteRow,
  type GrupoArvoreRow,
} from "./schemas.desconto";

// Tabela de preco (CRUD com camada de override sobre staging Salesforce).
export { salvarTabelaPreco } from "./api/salvarTabelaPreco";
export { removerTabelaPreco } from "./api/removerTabelaPreco";
export { obterTabelaPreco } from "./api/obterTabelaPreco";
export { listItensTabela } from "./api/listItensTabela";
export {
  salvarItensTabelaLote,
  type ItensTabelaLotePayload,
} from "./api/salvarItensTabelaLote";
export {
  useTabelaPreco,
  useItensTabela,
  useSalvarTabelaPreco,
  useSalvarItensTabelaLote,
  useRemoverTabelaPreco,
} from "./hooks/useTabelaPreco";
export {
  tabelaPrecoSchema,
  itemSchema,
  type TabelaPrecoForm,
  type TabelaPrecoDetalhe,
  type TabelaPrecoItemForm,
  type TabelaPrecoItemRow,
} from "./schemas.tabela";
