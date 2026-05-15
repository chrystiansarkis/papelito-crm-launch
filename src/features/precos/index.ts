export { listDescontos } from "./api/listDescontos";
export { salvarDesconto } from "./api/salvarDesconto";
export { removerDesconto } from "./api/removerDesconto";
export { listGruposArvore } from "./api/listGruposArvore";
export {
  useDescontos,
  useGruposArvore,
  useSalvarDesconto,
  useRemoverDesconto,
} from "./hooks/useDescontos";
export {
  descontoSchema,
  ESCOPOS,
  TIPOS,
  type DescontoForm,
  type DescontoRow,
  type GrupoArvoreRow,
} from "./schemas.desconto";
