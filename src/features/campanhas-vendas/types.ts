// Types da feature Campanhas de Vendas (premiação para força de vendas).
// Etapa 1: mockada. Etapa 2 substitui mocks por Supabase — types continuam.

export type StatusCampanha =
  | "rascunho"
  | "aprovada"
  | "em_andamento"
  | "apurada"
  | "finalizada"
  | "cancelada";

export type TipoMecanica = "pdv_novo" | "positivacao" | "volume";

export type CriterioPdvNovo = "cnpj_criado" | "pdv_inativo_retornou";

export type UnidadeVolume = "quantidade" | "valor_brl";

export type ModoPremiacao = "valor_fixo" | "percentual" | "tabela_faixa";

export type TipoPremio = "dinheiro" | "voucher" | "brinde" | "viagem" | "outro";

// Três escopos de quem pode receber a premiação:
// - equipe: pessoa interna (vendedor / supervisor / gerente)
// - cliente_pj: o próprio CNPJ (a empresa cliente recebe direto)
// - contato: pessoa física no cliente (dono, comprador, qualquer contato cadastrado)
export type EscopoBeneficiario = "equipe" | "cliente_pj" | "contato";

export type PapelEquipe = "vendedor" | "supervisor" | "gerente";

// Papel do contato externo. Mapeia para crm.funcao_contato + opções de negócio.
export type PapelContato =
  | "comprador"
  | "dono_pdv"
  | "gestor_pdv"
  | "decisor"
  | "influenciador"
  | "outro";

// Tipo de beneficiário usado nas regras de prêmio. Combina os 3 escopos.
export type TipoBeneficiario =
  | PapelEquipe
  | "cliente_pj"
  | PapelContato;

export type EscopoProdutos = "todos" | "especifico";

// Regra de meta — como a meta afeta o prêmio.
// - acompanhamento: meta serve só para visualização (% atingido).
// - bloqueio: se não bateu meta (100%), valor do prêmio é zerado.
// - proporcional: prêmio multiplicado pelo % atingido; corte mínimo opcional.
export type RegraMeta = "acompanhamento" | "bloqueio" | "proporcional";

export type MetaGeral = {
  // Uma meta por mecânica. A unidade é a mesma da mecânica (qtd / R$).
  mecanica_id: string;
  valor: number;
};

export type MetaVendedor = {
  id: string;
  mecanica_id: string;
  usuario_id: string;
  valor: number;
};

export type FaixaPremio = {
  de: number;
  ate: number;
  valor: number;
};

export type Mecanica = {
  id: string;
  tipo: TipoMecanica;
  // PDV novo aceita múltiplos critérios simultâneos (cnpj criado E/OU pdv inativo retornou).
  criterios_pdv_novo: CriterioPdvNovo[];
  meses_inatividade?: number;
  unidade_volume?: UnidadeVolume;
};

export type ProdutoEscopo = {
  id: string;
  cod_produto: string | null;
  cod_grupo_prod: string | null;
  nome_snapshot: string;
};

export type Premio = {
  id: string;
  mecanica_id: string;
  cod_produto: string | null;
  cod_grupo_prod: string | null;
  tipo_beneficiario: TipoBeneficiario;
  escopo_beneficiario: EscopoBeneficiario;
  tipo_premio: TipoPremio;
  descricao_premio: string;
  modo: ModoPremiacao;
  valor: number | null;
  faixas: FaixaPremio[] | null;
};

// Cliente PJ que recebe direto (CNPJ). Único caso em que ainda há lista
// explícita de "participantes" — porque cliente é entidade, não papel.
export type ParticipanteClientePJ = {
  id: string;
  cliente_id: string;
  observacao: string | null;
};

export type ApuracaoLinha = {
  id: string;
  mecanica_id: string;
  escopo_beneficiario: EscopoBeneficiario;
  tipo_beneficiario: TipoBeneficiario;
  // Identificação do beneficiário resolvido na apuração (não há mais lista
  // estática de participantes para equipe/contato).
  usuario_id: string | null;
  cliente_id: string | null;
  contato_id: string | null;
  // Quando vier de cliente_pj, referencia a linha em participantes_clientes_pj.
  participante_cliente_pj_id: string | null;
  tipo_premio: TipoPremio;
  descricao_premio: string;
  base_quantidade: number;
  base_valor: number;
  valor_premio: number;
  detalhes: Record<string, unknown>;
  revisao: number;
};

export type Campanha = {
  id: string;
  nome: string;
  objetivo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  data_fim_efetiva: string | null;
  status: StatusCampanha;

  // Quem recebe — definido por papel/escopo, não por pessoa específica.
  // Apuração resolve dinamicamente para todos os qualificados.
  inclui_vendedor: boolean;
  inclui_supervisor: boolean;
  inclui_gerente: boolean;
  inclui_cliente_pj: boolean;
  // Papéis de contato no cliente que recebem (vazio = nenhum contato premiado).
  papeis_contato_incluidos: PapelContato[];

  escopo_produtos: EscopoProdutos;

  // Metas (opcionais). Quando não cadastradas, regra_meta é ignorada.
  regra_meta: RegraMeta;
  meta_minima_proporcional: number; // 0–100; corte mínimo p/ proporcional
  metas_gerais: MetaGeral[];
  metas_vendedores: MetaVendedor[];

  observacoes: string;
  resumo_pos_encerramento: string | null;
  motivo_cancelamento: string | null;
  revisao_atual: number;
  apurada_em: string | null;
  created_at: string;
  updated_at: string;

  mecanicas: Mecanica[];
  produtos: ProdutoEscopo[];
  premios: Premio[];

  // Apenas Cliente PJ continua com lista — porque é entidade específica.
  participantes_clientes_pj: ParticipanteClientePJ[];

  apuracao: ApuracaoLinha[];
};

export type CampanhaFiltro = {
  busca: string;
  status: "" | StatusCampanha;
};

export const STATUS_CAMPANHA_LABEL: Record<StatusCampanha, string> = {
  rascunho: "Rascunho",
  aprovada: "Aprovada",
  em_andamento: "Em andamento",
  apurada: "Apurada",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

export const STATUS_CAMPANHA_VARIANT: Record<
  StatusCampanha,
  "soft" | "outline" | "warn" | "healthy" | "risk"
> = {
  rascunho: "outline",
  aprovada: "soft",
  em_andamento: "warn",
  apurada: "soft",
  finalizada: "healthy",
  cancelada: "risk",
};

export const KANBAN_COLUNAS: StatusCampanha[] = [
  "rascunho",
  "aprovada",
  "em_andamento",
  "apurada",
  "finalizada",
];

export const TIPO_MECANICA_LABEL: Record<TipoMecanica, string> = {
  pdv_novo: "PDV novo",
  positivacao: "Positivação de PDV",
  volume: "Volume de produto",
};

export const CRITERIO_PDV_NOVO_LABEL: Record<CriterioPdvNovo, string> = {
  cnpj_criado: "CNPJ criado no período",
  pdv_inativo_retornou: "PDV inativo que retornou",
};

export const UNIDADE_VOLUME_LABEL: Record<UnidadeVolume, string> = {
  quantidade: "Quantidade (un)",
  valor_brl: "Valor (R$)",
};

export const MODO_PREMIACAO_LABEL: Record<ModoPremiacao, string> = {
  valor_fixo: "Valor fixo",
  percentual: "Percentual",
  tabela_faixa: "Tabela por faixa",
};

export const TIPO_PREMIO_LABEL: Record<TipoPremio, string> = {
  dinheiro: "Dinheiro (R$)",
  voucher: "Voucher",
  brinde: "Brinde",
  viagem: "Viagem",
  outro: "Outro",
};

export const PAPEL_EQUIPE_LABEL: Record<PapelEquipe, string> = {
  vendedor: "Vendedor",
  supervisor: "Supervisor",
  gerente: "Gerente",
};

export const PAPEL_CONTATO_LABEL: Record<PapelContato, string> = {
  comprador: "Comprador",
  dono_pdv: "Dono do PDV",
  gestor_pdv: "Gestor do PDV",
  decisor: "Decisor",
  influenciador: "Influenciador",
  outro: "Outro",
};

export const REGRA_META_LABEL: Record<RegraMeta, string> = {
  acompanhamento: "Apenas acompanhamento",
  bloqueio: "Bloqueia prêmio se não bater meta",
  proporcional: "Proporcional ao % atingido",
};

export const TIPO_BENEFICIARIO_LABEL: Record<TipoBeneficiario, string> = {
  vendedor: "Vendedor",
  supervisor: "Supervisor",
  gerente: "Gerente",
  cliente_pj: "Cliente (CNPJ)",
  comprador: "Comprador",
  dono_pdv: "Dono do PDV",
  gestor_pdv: "Gestor do PDV",
  decisor: "Decisor",
  influenciador: "Influenciador",
  outro: "Outro contato",
};

export const PAPEIS_EQUIPE: PapelEquipe[] = ["vendedor", "supervisor", "gerente"];
export const PAPEIS_CONTATO: PapelContato[] = [
  "comprador",
  "dono_pdv",
  "gestor_pdv",
  "decisor",
  "influenciador",
  "outro",
];

export function escopoDoTipo(t: TipoBeneficiario): EscopoBeneficiario {
  if (t === "cliente_pj") return "cliente_pj";
  if (PAPEIS_EQUIPE.includes(t as PapelEquipe)) return "equipe";
  return "contato";
}
