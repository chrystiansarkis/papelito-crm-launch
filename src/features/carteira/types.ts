export type CarteiraCliente = {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  saude: string | null;
  score_pagamento: string | null;
  tier: string | null;
  status: string | null;
  vendedor_nome: string | null;
  faturamento_12m: number;
  ultima_compra: string | null;
  em_familia_papelito: boolean;
  em_pdv_perfeito: boolean;
};

export type CarteiraKpis = {
  total: number;
  saudaveis: number;
  em_risco: number;
  faturamento: number;
};

export type CarteiraFiltro = {
  busca: string;
  saude: string;
  vendedor: string;
  programa: "" | "familia" | "pdv";
  page: number;
};

export const CARTEIRA_PAGE_SIZE = 50;
