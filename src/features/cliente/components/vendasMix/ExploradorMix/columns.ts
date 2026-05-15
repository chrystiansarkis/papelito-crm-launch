// Colunas-meta manipuláveis do ExploradorMix.
// Períodos NÃO entram aqui — são geradas dinamicamente pelo filtro de período.
//
// IMPORTANTE: R$ e unidades são colunas separadas (não empilhadas) para
// facilitar leitura e export. Idem Tend/Cresc/Venda12m/Total.
export type MixColumnId =
  | "total_rs"
  | "total_qtd"
  | "venda12m_rs"
  | "venda12m_qtd"
  | "cresc12m_rs"
  | "cresc12m_qtd"
  | "tend_rs"
  | "tend_qtd"
  | "vs"
  | "ticket"
  | "sem_compra"
  | "obs";

export const MIX_COLUMN_IDS: MixColumnId[] = [
  "total_rs", "total_qtd",
  "venda12m_rs", "venda12m_qtd",
  "cresc12m_rs", "cresc12m_qtd",
  "tend_rs", "tend_qtd",
  "vs", "ticket", "sem_compra", "obs",
];

export const MIX_COLUMN_LABEL: Record<MixColumnId, string> = {
  total_rs: "Total R$",
  total_qtd: "Total Un",
  venda12m_rs: "Venda 12m R$",
  venda12m_qtd: "Venda 12m Un",
  cresc12m_rs: "Cresc. 12m R$",
  cresc12m_qtd: "Cresc. 12m Un",
  tend_rs: "Tend. 2026 R$",
  tend_qtd: "Tend. 2026 Un",
  vs: "Vs 2025",
  ticket: "Ticket médio",
  sem_compra: "Sem compra · última",
  obs: "Obs",
};

// Default = todas visíveis.
export const MIX_DEFAULT_VISIBILITY: Record<MixColumnId, boolean> = {
  total_rs: true, total_qtd: true,
  venda12m_rs: true, venda12m_qtd: true,
  cresc12m_rs: true, cresc12m_qtd: true,
  tend_rs: true, tend_qtd: true,
  vs: true, ticket: true, sem_compra: true, obs: true,
};

// Total fica fixo logo depois dos períodos. Resto é manipulável.
export const MIX_FIXED_TOP: MixColumnId[] = ["total_rs", "total_qtd"];
export const MIX_DEFAULT_ORDER: MixColumnId[] = [
  "venda12m_rs", "venda12m_qtd",
  "cresc12m_rs", "cresc12m_qtd",
  "tend_rs", "tend_qtd",
  "vs", "ticket", "sem_compra", "obs",
];

