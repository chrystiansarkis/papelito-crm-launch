export type CobrancaKpis = {
  carteira_aberta: number | null;
  carteira_vencida: number | null;
  pct_vencido: number | null;
  clientes_com_aberto: number | null;
  clientes_inadimplentes: number | null;
  vencido_1_30: number | null;
  vencido_31_90: number | null;
  vencido_91_mais: number | null;
  dso_dias: number | null;
  acordos_ativos: number | null;
  promessas_pendentes: number | null;
};

export type CobrancaRow = {
  cliente_id: string;
  nome: string;
  cgc_matriz: string | null;
  saude: string | null;
  score: string | null;
  bloqueado: string | null;
  em_familia_papelito: boolean;
  vendedor_nome: string | null;
  total_aberto: number;
  total_vencido: number;
  qtd_titulos: number;
  qtd_titulos_vencidos: number;
  dias_maximo_atraso: number;
  v_1_5: number;
  v_6_15: number;
  v_16_30: number;
  v_31_60: number;
  v_61_90: number;
  v_91_120: number;
  v_121_360: number;
  v_361_mais: number;
  av_1_5: number | null;
  av_6_15: number | null;
  av_16_30: number | null;
  av_31_mais: number | null;
  tem_acordo: boolean;
  tem_promessa: boolean;
};

export type Acordo = {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  tipo: string | null;
  status: string;
  valor_original: number;
  valor_final: number;
  valor_pago: number;
  qtd_parcelas: number;
  parcelas_pagas: number;
  parcelas_vencidas: number;
  parcelas_a_vencer: number;
  proxima_parcela_data: string | null;
  proxima_parcela_valor: number | null;
  negociado_por_nome: string | null;
  aprovado_por_nome: string | null;
  observacao: string | null;
};

export type Promessa = {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  vendedor_nome: string | null;
  data_prometida: string;
  valor: number;
  situacao: string;
  registrado_por_nome: string | null;
};

export type ReguaKpis = {
  enviadas_7d: number | null;
  agendadas_hoje: number | null;
  agendadas_7d: number | null;
  taxa_sucesso_30d: number | null;
};

export type ReguaPasso = {
  passo_ordem: number;
  dia_atraso: number;
  canal: string;
  acao: string | null;
  template_nome: string | null;
};

export type ReguaProxima = {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  vendedor_nome: string | null;
  scheduled_at: string;
  canal: string;
  acao: string | null;
  status: string;
};

export type ReguaHistorico = {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  sent_at: string;
  canal: string;
  acao: string | null;
  status: string;
  observacao: string | null;
};

export type CobrancaFaixa = "" | "1-30" | "31-90" | "91+";

export type CobrancaCarteiraFiltro = {
  busca: string;
  faixa: CobrancaFaixa;
  vendedor: string;
  score: string;
  comAcordo: boolean;
  page: number;
};

export type FiltroSituacaoPromessa = "" | "pendentes" | "cumprida" | "quebrada";

export const COBRANCA_PAGE_SIZE = 50;
