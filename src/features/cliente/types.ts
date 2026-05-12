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
