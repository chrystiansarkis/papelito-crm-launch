// Colunas-meta manipuláveis do ExploradorMix.
// Períodos NÃO entram aqui — são geradas dinamicamente pelo filtro de período.
export type MixColumnId =
  | "total"
  | "venda12m"
  | "cresc12m"
  | "tend"
  | "vs"
  | "ticket"
  | "sem_compra"
  | "obs";

export const MIX_COLUMN_IDS: MixColumnId[] = [
  "total", "venda12m", "cresc12m", "tend", "vs", "ticket", "sem_compra", "obs",
];

export const MIX_COLUMN_LABEL: Record<MixColumnId, string> = {
  total: "Total",
  venda12m: "Venda 12m",
  cresc12m: "Cresc. 12m",
  tend: "Tend. 2026",
  vs: "Vs 2025",
  ticket: "Ticket médio",
  sem_compra: "Sem compra · última",
  obs: "Obs",
};

// Default = todas visíveis.
export const MIX_DEFAULT_VISIBILITY: Record<MixColumnId, boolean> = {
  total: true, venda12m: true, cresc12m: true,
  tend: true, vs: true, ticket: true, sem_compra: true, obs: true,
};

// Total fica fixo logo depois dos períodos. Resto é manipulável.
export const MIX_FIXED_TOP: MixColumnId[] = ["total"];
export const MIX_DEFAULT_ORDER: MixColumnId[] = [
  "venda12m", "cresc12m", "tend", "vs", "ticket", "sem_compra", "obs",
];