export type ClienteFicha = {
  id: string;
  nome: string;
  razao_social: string | null;
  cgc_matriz: string | null;
  cidade: string | null;
  uf: string | null;
  tipo: string | null;
  tier: string | null;
  saude: string | null;
  status: string | null;
  em_familia_papelito: boolean;
  em_pdv_perfeito: boolean;
  observacao_fixada: string | null;
  tags: string[] | null;
  vendedor_nome: string | null;
  vendedor_papel: string | null;
  faturamento_12m: number;
  faturamento_12m_anterior: number;
  faturamento_ytd: number;
  faturamento_mes_corrente: number;
  qtd_pedidos_12m: number;
  qtd_pedidos_total: number;
  data_ultima_compra: string | null;
  dias_sem_compra: number | null;
  ticket_medio_12m: number;
  score_pagamento: string | null;
  total_aberto: number;
  total_vencido: number;
  qtd_titulos_vencidos: number;
  dias_maximo_atraso: number;
  limite_credito: number | null;
  limite_pct_utilizado: number | null;
};

export type Pedido = {
  numero_pedido: string;
  numero_nota: string | null;
  data_negociacao: string;
  qtd_total: number;
  valor_liquido: number;
  tipo_operacao: string | null;
};

export type Contato = {
  id: string;
  nome: string;
  cargo: string | null;
  email: string | null;
  telefones: unknown;
  principal: boolean;
};

export type Observacao = {
  id: string;
  conteudo: string;
  pinned: boolean;
  created_at: string;
  autor_nome: string | null;
};

// =====================================================================
// Sprint 1 Ficha Cliente — tipos novos
// =====================================================================

// Linha agregada de public.vw_carteira_clientes_kpi (1 row por cliente).
// Espelho parcial de ClienteKpi de carteira/types — duplicamos aqui só
// pra desacoplar feature cliente de feature carteira.
export type ClienteFichaKpi = {
  cliente_id: string;
  faturamento_12m: number;
  faturamento_ano_anterior: number;
  pct_crescimento: number | null;
  data_ultima_compra: string | null;
  dias_sem_compra: number | null;
  data_ultimo_atendimento: string | null;
  tem_vencido: boolean;
  valor_vencido: number;
  fat_12m_papeis: number;
  fat_12m_filtros: number;
  fat_12m_piteiras: number;
  fat_12m_outros: number;
  tier: string | null;
};

export type MixTierRow = {
  tier: string;
  pct_papeis: number;
  pct_filtros: number;
  pct_piteiras: number;
  pct_outros: number;
  clientes_no_tier: number;
};

export type TopSkuRow = {
  cliente_id: string;
  cod_produto: string;
  nome_produto: string | null;
  fat_12m: number;
  fat_12m_anterior: number;
  yoy_pct: number | null;
  rank_cliente: number;
  total_skus: number;
};

export type PadraoCompraRow = {
  cliente_id: string;
  data_primeiro_pedido: string | null;
  data_ultimo_pedido: string | null;
  total_pedidos: number;
  frequencia_media_dias: number | null;
  dia_preferido_dow: number | null;
  dia_preferido_pct: number | null;
  ticket_min: number | null;
  ticket_max: number | null;
  ticket_medio: number | null;
  mes_mais_forte: number | null;
};

export type VendaMensal = {
  mes: string; // ISO date 1º do mês
  valor: number;
};

export type EventoTimelineKind = "pedido" | "ligacao" | "visita" | "anotacao" | "whatsapp" | "email";

export type EventoTimeline = {
  id: string;
  kind: EventoTimelineKind;
  data: string;
  titulo: string;
  detalhe: string | null;
};

export type MetaTrimestre = {
  id: string;
  cliente_id: string;
  ano: number;
  trimestre: number;
  valor: number;
  status: "pendente" | "aprovada" | "recusada";
};

export type AcaoSeverity = "danger" | "warn" | "success" | "info";

export type AcaoSugerida = {
  id: string;
  rule: string;
  severity: AcaoSeverity;
  icon: string;
  title: string;
  body: string;
  // Pra modo "alerta resumido" (Bloco 4.7)
  shortLabel: string;
};
