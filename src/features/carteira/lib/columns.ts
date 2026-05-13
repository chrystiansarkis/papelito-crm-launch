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

export type SortType = "string" | "number" | "date" | "enum";

export type CarteiraColumnDef = {
  id: CarteiraColumnId;
  label: string;
  fixed?: boolean;
  // Visibilidade padrão. Default = true. Colunas opt-in marcam false.
  defaultVisible?: boolean;
  // Ordenação. Default sortable=true; rfv/camp/proxima_acao = false.
  sortable?: boolean;
  sortType?: SortType;
  enumOrder?: string[];
};

// Ordens custom de enums (case-insensitive na hora de comparar).
const SAUDE_ORDER = ["saudavel", "atencao", "em_risco", "sumido"];
const TIER_ORDER = ["A", "B", "C", "D", "E"];
const SCORE_ORDER = ["A", "B", "C", "D", "E"];

export const CARTEIRA_COLUMNS: CarteiraColumnDef[] = [
  { id: "cliente", label: "Cliente", fixed: true, sortable: true, sortType: "string" },
  { id: "saude", label: "Saúde", sortable: true, sortType: "enum", enumOrder: SAUDE_ORDER },
  { id: "tipo", label: "Tipo", sortable: true, sortType: "string" },
  { id: "rfv", label: "RFV", sortable: false },
  { id: "yoy", label: "YoY", sortable: true, sortType: "number" },
  { id: "pedidos_12m", label: "Pedidos 12m", sortable: true, sortType: "number" },
  { id: "fat_12m", label: "Fat. 12m", sortable: true, sortType: "number" },
  { id: "fat_2020", label: "Fat. 2020", defaultVisible: false, sortable: true, sortType: "number" },
  { id: "fat_2021", label: "Fat. 2021", defaultVisible: false, sortable: true, sortType: "number" },
  { id: "fat_2022", label: "Fat. 2022", defaultVisible: false, sortable: true, sortType: "number" },
  { id: "fat_2023", label: "Fat. 2023", defaultVisible: false, sortable: true, sortType: "number" },
  { id: "fat_2024", label: "Fat. 2024", defaultVisible: false, sortable: true, sortType: "number" },
  { id: "fat_2025", label: "Fat. 2025", defaultVisible: false, sortable: true, sortType: "number" },
  { id: "fat_2026", label: "Fat. 2026 YTD", defaultVisible: false, sortable: true, sortType: "number" },
  { id: "tendencia_2026", label: "Tend. 2026", defaultVisible: false, sortable: true, sortType: "number" },
  { id: "desvio_2026", label: "Desvio 2026", defaultVisible: false, sortable: true, sortType: "number" },
  { id: "ticket_medio", label: "Ticket méd.", sortable: true, sortType: "number" },
  { id: "sem_compra", label: "Sem compra", sortable: true, sortType: "number" },
  { id: "ultima_venda", label: "Última venda", sortable: true, sortType: "date" },
  { id: "ultimo_atendimento", label: "Último atendimento", sortable: true, sortType: "date" },
  { id: "vendedor", label: "Vendedor", sortable: true, sortType: "string" },
  { id: "camp", label: "Camp.", sortable: false },
  { id: "vencido", label: "Vencido", sortable: true, sortType: "number" },
  { id: "limite_pct", label: "Limite %", sortable: true, sortType: "number" },
  { id: "fin", label: "Fin.", sortable: true, sortType: "enum", enumOrder: SCORE_ORDER },
  { id: "proxima_acao", label: "Próxima ação IA", sortable: false },
];

// Tier não é coluna própria mas é usado em outros lugares; expomos a ordem.
export { TIER_ORDER };

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

export const COLUMN_BY_ID: Record<CarteiraColumnId, CarteiraColumnDef> =
  CARTEIRA_COLUMNS.reduce(
    (acc, c) => {
      acc[c.id] = c;
      return acc;
    },
    {} as Record<CarteiraColumnId, CarteiraColumnDef>,
  );