export type CarteiraColumnId =
  | "cliente"
  | "saude"
  | "tipo"
  | "rfv"
  | "yoy"
  | "pedidos_12m"
  | "fat_12m"
  | "fat_2020"
  | "fat_2021"
  | "fat_2022"
  | "fat_2023"
  | "fat_2024"
  | "fat_2025"
  | "fat_2026"
  | "tendencia_2026"
  | "desvio_2026"
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
  // Visibilidade padrão. Default = true. Colunas opt-in marcam false.
  defaultVisible?: boolean;
};

export const CARTEIRA_COLUMNS: CarteiraColumnDef[] = [
  { id: "cliente", label: "Cliente", fixed: true },
  { id: "saude", label: "Saúde" },
  { id: "tipo", label: "Tipo" },
  { id: "rfv", label: "RFV" },
  { id: "yoy", label: "YoY" },
  { id: "pedidos_12m", label: "Pedidos 12m" },
  { id: "fat_12m", label: "Fat. 12m" },
  { id: "fat_2020", label: "Fat. 2020", defaultVisible: false },
  { id: "fat_2021", label: "Fat. 2021", defaultVisible: false },
  { id: "fat_2022", label: "Fat. 2022", defaultVisible: false },
  { id: "fat_2023", label: "Fat. 2023", defaultVisible: false },
  { id: "fat_2024", label: "Fat. 2024", defaultVisible: false },
  { id: "fat_2025", label: "Fat. 2025", defaultVisible: false },
  { id: "fat_2026", label: "Fat. 2026 YTD", defaultVisible: false },
  { id: "tendencia_2026", label: "Tend. 2026", defaultVisible: false },
  { id: "desvio_2026", label: "Desvio 2026", defaultVisible: false },
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
      acc[c.id] = c.defaultVisible !== false;
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