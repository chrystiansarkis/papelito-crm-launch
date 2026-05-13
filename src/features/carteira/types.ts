// Mitigates: A05 (modelagem de tipos para que filtros sejam validados pelo
//            schema antes de virarem query)
//
// CarteiraCliente reflete public.vw_cliente_ficha — view rica com KPIs
// financeiros, cobrança, vendedor, programa e identificação por matriz.

export type CarteiraCliente = {
  id: string;
  nome: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  apelido: string | null;
  cgc_matriz: string | null;
  cgc_matriz_normalizado: string | null;
  // Localização
  cidade: string | null;
  uf: string | null;
  estado: string | null;
  // Classificação
  tipo: string | null;
  tier: string | null;
  saude: string | null;
  status: string | null;
  rfv_score: number | null;
  // Programas
  em_familia_papelito: boolean;
  em_pdv_perfeito: boolean;
  // Tags / obs
  observacao_fixada: string | null;
  tags: string[] | null;
  // CNPJs
  qtd_cnpjs: number;
  qtd_cnpjs_ativos: number;
  // Origem
  tem_protheus: boolean;
  tem_sankhya: boolean;
  tem_salesforce: boolean;
  // Vendedor
  vendedor_responsavel_id: string | null;
  vendedor_nome: string | null;
  vendedor_papel: string | null;
  // Financeiro
  faturamento_12m: number;
  faturamento_12m_anterior: number;
  faturamento_ytd: number;
  faturamento_mes_corrente: number;
  qtd_pedidos_12m: number;
  qtd_pedidos_total: number;
  data_ultima_compra: string | null;
  dias_sem_compra: number | null;
  ticket_medio_12m: number;
  // Pagamento / cobrança
  score_pagamento: string | null;
  score_pagamento_ia: string | null;
  score_override: boolean;
  bloqueado_cobranca: string | null;
  bloqueado_motivo: string | null;
  total_aberto: number;
  total_vencido: number;
  qtd_titulos_vencidos: number;
  dias_maximo_atraso: number | null;
  // Limite
  limite_credito: number;
  limite_usado: number;
  limite_pct_utilizado: number | null;
  // Acordos / promessas
  tem_acordo_ativo: boolean;
  tem_promessa_pendente: boolean;
  // Aliases legacy usados em código antigo (ClientList lia c.ultima_compra)
  ultima_compra: string | null;
};

export type CarteiraKpis = {
  total: number;
  saudaveis: number;
  em_risco: number;
  faturamento: number;
};

// Filtros locais (page, sort) — combinados com GlobalFilters compartilhados
// na camada de página antes de cair na API.
export type CarteiraFiltro = {
  busca: string;
  saude: string;
  vendedor: string;
  programa: "" | "familia" | "pdv";
  uf: string;
  tipo: string;
  score: string;
  tier: string;
  fonte: string; // PROTHEUS | SALESFORCE | SANKHYA
  periodo: string; // ano YYYY
  page: number;
};

export const CARTEIRA_PAGE_SIZE = 50;

// =====================================================================
// KPIs novos — alimentados por public.vw_carteira_clientes_kpi
// (1 linha por cliente, ~1700 rows). Carregamos tudo e agregamos no front.
// =====================================================================

export type GrupoPai = "papeis" | "filtros" | "piteiras" | "outros";
export type PeriodoGrupo = "2025" | "ytd" | "12m";
export type FaixaRecencia = "0-30" | "31-60" | "61-90" | "91-180" | "180+" | "nunca";

export type ClienteKpi = {
  cliente_id: string;
  nome_fantasia: string | null;
  razao_social: string | null;
  saude: string | null;
  tipo: string | null;
  tier: string | null;
  status_cliente: string | null;
  score_pagamento: string | null;
  bloqueado_cobranca: string | null;
  vendedor_responsavel_id: string | null;
  vendedor_nome: string | null;
  uf: string | null;
  em_familia_papelito: boolean;
  em_pdv_perfeito: boolean;
  tem_protheus: boolean;
  tem_sankhya: boolean;
  tem_salesforce: boolean;
  dias_sem_compra: number | null;
  data_ultima_compra: string | null;
  faturamento_12m: number;
  faturamento_ytd: number;
  faturamento_ano_anterior: number;
  tendencia_ano: number;
  pct_crescimento: number | null;
  comprou_2025: boolean;
  comprou_2026: boolean;
  fat_12m_papeis: number;
  fat_12m_filtros: number;
  fat_12m_piteiras: number;
  fat_12m_outros: number;
  fat_2025_papeis: number;
  fat_2025_filtros: number;
  fat_2025_piteiras: number;
  fat_2025_outros: number;
  fat_ytd_papeis: number;
  fat_ytd_filtros: number;
  fat_ytd_piteiras: number;
  fat_ytd_outros: number;
  valor_vencido: number;
  tem_vencido: boolean;
};

export type CarteiraFilter = {
  ano_compra: "comprou_2025" | "comprou_2026" | null;
  grupo_pai: GrupoPai | null;
  periodo_grupo: PeriodoGrupo | null;
  recencia: FaixaRecencia | null;
  tendencia: "crescendo" | "caindo" | null;
  vencido: boolean;
};

export const EMPTY_CARTEIRA_FILTER: CarteiraFilter = {
  ano_compra: null,
  grupo_pai: null,
  periodo_grupo: null,
  recencia: null,
  tendencia: null,
  vencido: false,
};
