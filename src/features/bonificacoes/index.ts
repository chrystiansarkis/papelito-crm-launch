export {
  listBonificacoesCliente,
  getBonificacaoSaldo,
} from "./api/listBonificacoes";
export { registrarBonificacao } from "./api/registrarBonificacao";
export { baixarBonificacao, cancelarBonificacao } from "./api/baixarBonificacao";
export {
  useBonificacoesCliente,
  useBonificacaoSaldo,
  useRegistrarBonificacao,
  useBaixarBonificacao,
  useCancelarBonificacao,
} from "./hooks/useBonificacoes";
export {
  registrarBonificacaoSchema,
  baixarBonificacaoSchema,
  bonificacaoItemFormSchema,
  BONIFICACAO_TIPO,
  BONIFICACAO_STATUS,
  BONIFICACAO_STATUS_LABEL,
  type BonificacaoRow,
  type BonificacaoItemRow,
  type BonificacaoSaldo,
  type BonificacaoStatus,
  type BonificacaoTipo,
  type RegistrarBonificacaoForm,
  type BonificacaoItemForm,
  type BaixarBonificacaoForm,
} from "./schemas.bonificacao";
export { RegistrarBonificacaoDialog } from "./components/RegistrarBonificacaoDialog";
export { BonificacoesTab } from "./components/BonificacoesTab";
export { ClientesRegraPanel } from "./components/ClientesRegraPanel";
export {
  ClientesPendentesPanel,
  type ClientePendente,
} from "./components/ClientesPendentesPanel";
export { GrupoCombo, ProdutoCombo } from "./components/combos";

// Engine de regras
export {
  listRegras,
  salvarRegra,
  desativarRegra,
  sugerirBonificacao,
  listClientesRegra,
  associarClientesRegra,
  desassociarClienteRegra,
  listRegrasCliente,
  definirRegrasCliente,
  resolverClientes,
} from "./api/regras";
export {
  useRegras,
  useSalvarRegra,
  useDesativarRegra,
  useSugestaoBonificacao,
  useClientesRegra,
  useAssociarClientesRegra,
  useDesassociarClienteRegra,
  useRegrasDoCliente,
  useDefinirRegrasCliente,
} from "./hooks/useRegras";
export {
  regraSchema,
  TIPO_REGRA,
  TIPO_REGRA_LABEL,
  type RegraForm,
  type RegraRow,
  type TipoRegra,
  type SugestaoBonificacao,
  type ClienteVinculadoRow,
  type AssociarResultado,
  type RegraDoCliente,
  type ClienteResolvido,
  type ResolverClientesResult,
} from "./schemas.regra";
