export type CarteiraColumnId =
  | "cliente"
  | "saude"
  | "tipo"
  | "rfv"
  | "yoy"
  | "pedidos_12m"
  | "fat_12m"
  | "ticket_medio"
  | "sem_compra"
  | "ultima_venda"
  | "ultimo_atendimento"
  | "vendedor"
  | "camp"
  | "vencido"
  | "limite_pct"
  | "fin"
  | "proxima_acao";

export type CarteiraColumnDef = {
  id: CarteiraColumnId;
  label: string;
  fixed?: boolean;
};

export const CARTEIRA_COLUMNS: CarteiraColumnDef[] = [
  { id: "cliente", label: "Cliente", fixed: true },
  { id: "saude", label: "Saúde" },
  { id: "tipo", label: "Tipo" },
  { id: "rfv", label: "RFV" },
  { id: "yoy", label: "YoY" },
  { id: "pedidos_12m", label: "Pedidos 12m" },
  { id: "fat_12m", label: "Fat. 12m" },
  { id: "ticket_medio", label: "Ticket méd." },
  { id: "sem_compra", label: "Sem compra" },
  { id: "ultima_venda", label: "Última venda" },
  { id: "ultimo_atendimento", label: "Último atendimento" },
  { id: "vendedor", label: "Vendedor" },
  { id: "camp", label: "Camp." },
  { id: "vencido", label: "Vencido" },
  { id: "limite_pct", label: "Limite %" },
  { id: "fin", label: "Fin." },
  { id: "proxima_acao", label: "Próxima ação IA" },
];

export const CARTEIRA_COLUMN_IDS: CarteiraColumnId[] = CARTEIRA_COLUMNS.map(
  (c) => c.id,
);

export const DEFAULT_VISIBILITY: Record<CarteiraColumnId, boolean> =
  CARTEIRA_COLUMNS.reduce(
    (acc, c) => {
      acc[c.id] = true;
      return acc;
    },
    {} as Record<CarteiraColumnId, boolean>,
  );

// Apenas colunas manipuláveis (sem as fixed).
export const DEFAULT_ORDER: CarteiraColumnId[] = CARTEIRA_COLUMNS.filter(
  (c) => !c.fixed,
).map((c) => c.id);

export const COLUMN_LABEL: Record<CarteiraColumnId, string> =
  CARTEIRA_COLUMNS.reduce(
    (acc, c) => {
      acc[c.id] = c.label;
      return acc;
    },
    {} as Record<CarteiraColumnId, string>,
  );