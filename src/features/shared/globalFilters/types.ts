// Mitigates: A05 (filtros tipados; valores parseados antes de chegarem ao
//            query builder do Supabase)
//
// GlobalFilters é o contrato único de filtragem compartilhado entre Carteira
// e Pedidos. Cada página declara, via GLOBAL_FILTER_APPLICABILITY, quais
// chaves pode aplicar — as demais aparecem desabilitadas com tooltip.

export type GlobalFilterKey =
  | "vendedor"
  | "uf"
  | "tipo"
  | "saude"
  | "tier"
  | "programa"
  | "fonte"
  | "status"
  | "score"
  | "periodo"
  | "busca";

export type ProgramaValue = "" | "familia" | "pdv";
export type FonteValue = "" | "PROTHEUS" | "SALESFORCE" | "SANKHYA";
export type SaudeValue = "" | "saudavel" | "atencao" | "em_risco" | "sumido";
export type TipoValue = "" | "lojista" | "distribuidor" | "outro";
export type ScoreValue = "" | "A" | "B" | "C" | "D" | "E";
export type StatusPedido =
  | ""
  | "rascunho"
  | "enviado"
  | "aprovado"
  | "pendente"
  | "bloqueado"
  | "faturado"
  | "recusado"
  | "ruptura"
  | "outro";

export type GlobalFilters = {
  busca: string;
  vendedor: string;
  uf: string;
  tipo: TipoValue;
  saude: SaudeValue;
  tier: string;
  programa: ProgramaValue;
  fonte: FonteValue;
  status: StatusPedido;
  score: ScoreValue;
  periodo: string; // ano como string ("2026") ou "" para todos
};

export const INITIAL_GLOBAL_FILTERS: GlobalFilters = {
  busca: "",
  vendedor: "",
  uf: "",
  tipo: "",
  saude: "",
  tier: "",
  programa: "",
  fonte: "",
  status: "",
  score: "",
  periodo: "",
};

// Mapa view → filtros aplicáveis (campo existe na view).
// Filtros fora desse set ficam disabled com tooltip "não disponível nesta visão".
export const GLOBAL_FILTER_APPLICABILITY: Record<
  "carteira" | "pedidos",
  ReadonlySet<GlobalFilterKey>
> = {
  carteira: new Set<GlobalFilterKey>([
    "busca",
    "vendedor",
    "uf",
    "tipo",
    "saude",
    "tier",
    "programa",
    "fonte",
    "score",
    "periodo",
  ]),
  pedidos: new Set<GlobalFilterKey>([
    "busca",
    "vendedor",
    "uf",
    "tipo",
    "saude",
    "tier",
    "programa",
    "fonte",
    "status",
    "score",
    "periodo",
  ]),
};

// Filtros sem dados no banco (cobertura 0): renderizam disabled mesmo nas
// views que tecnicamente os suportam. Atualizar quando o dado entrar.
export const GLOBAL_FILTER_EMPTY_IN_DB: ReadonlySet<GlobalFilterKey> = new Set([
  "tier",
  "programa",
]);
