// Colunas-meta manipuláveis do ExploradorMix.
// Períodos NÃO entram aqui — são geradas dinamicamente pelo filtro de período.
export type MixColumnId =
  | "total"
  | "tend"
  | "vs"
  | "ticket"
  | "sem_compra"
  | "obs";

export const MIX_COLUMN_IDS: MixColumnId[] = [
  "total", "tend", "vs", "ticket", "sem_compra", "obs",
];

export const MIX_COLUMN_LABEL: Record<MixColumnId, string> = {
  total: "Total",
  tend: "Tend. 2026",
  vs: "Vs 2025",
  ticket: "Ticket médio",
  sem_compra: "Sem compra · última",
  obs: "Obs",
};

// Default = todas visíveis.
export const MIX_DEFAULT_VISIBILITY: Record<MixColumnId, boolean> = {
  total: true, tend: true, vs: true, ticket: true, sem_compra: true, obs: true,
};

// Total fica fixo logo depois dos períodos. Resto é manipulável.
export const MIX_FIXED_TOP: MixColumnId[] = ["total"];
export const MIX_DEFAULT_ORDER: MixColumnId[] = [
  "tend", "vs", "ticket", "sem_compra", "obs",
];