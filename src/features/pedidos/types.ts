// Mitigates: A05 (modelagem de tipos; filtros validados antes de virarem query)
//
// Pedido reflete o header de public.vw_pedidos_enriched (vw_pedidos + LEFT JOIN
// vw_cliente_ficha). É read-only. Os campos `cliente_*` permitem filtrar/exibir
// dados do cliente sem nova request.

export type PedidoFonte = "PROTHEUS" | "SALESFORCE" | "SANKHYA";

export type PedidoStatus =
  | "rascunho"
  | "enviado"
  | "aprovado"
  | "pendente"
  | "bloqueado"
  | "faturado"
  | "recusado"
  | "ruptura"
  | "outro";

export type PedidoItem = {
  id: string;
  sequencia: string | null;
  cod_grupo_prod: string | null;
  grupo_nome: string | null;
  grupo_caminho: string | null;
  cod_produto: string | null;
  cod_prod_origem: string | null;
  produto_nome: string | null;
  produto_unidade: string | null;
  qtd: number;
  vlr_unit: number;
  vlr_bruto: number;
  vlr_desc: number;
  vlr_liq: number;
};

export type Pedido = {
  id: string;
  fonte: PedidoFonte | string;
  numero: string;
  cgc_emp: string | null;
  numero_nota: string | null;
  data_pedido: string | null;
  ano_pedido: number | null;
  cgc_parceiro: string | null;
  cliente_id: string | null;
  cliente_nome: string | null;
  cod_vend: string | null;
  vendedor_id: string | null;
  vendedor_nome: string | null;
  status: PedidoStatus;
  status_raw: string | null;
  itens_count: number;
  subtotal: number;
  desconto: number;
  total: number;
  // Enriched (do cliente via JOIN — podem ser null para pedidos sem cliente_id)
  cliente_uf: string | null;
  cliente_cidade: string | null;
  cliente_tipo: string | null;
  cliente_tier: string | null;
  cliente_saude: string | null;
  cliente_score: string | null;
  cliente_em_familia: boolean;
  cliente_em_pdv: boolean;
  cliente_bloqueado: string | null;
  cliente_tem_acordo: boolean;
  cliente_total_vencido: number;
  cliente_limite_pct: number | null;
  cliente_dias_sem_compra: number | null;
  cliente_ticket_medio: number;
  cliente_faturamento_12m: number;
};

export type PedidosKpis = {
  total: number;
  valor_total: number;
  pendentes: number;
  faturados_mes: number;
};

// PedidoFiltro agora carrega todas as chaves globais — campos vazios são
// ignorados na construção da query. page fica local da página.
export type PedidoFiltro = {
  busca: string;
  status: "" | PedidoStatus;
  fonte: "" | PedidoFonte;
  vendedor: string;
  uf: string;
  tipo: string;
  saude: string;
  programa: "" | "familia" | "pdv";
  score: string;
  tier: string;
  periodo: string; // ano YYYY
  page: number;
};

export const PEDIDOS_PAGE_SIZE = 20;

export const PEDIDO_STATUS_LABEL: Record<PedidoStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  pendente: "Pendente",
  bloqueado: "Bloqueado",
  faturado: "Faturado",
  recusado: "Recusado",
  ruptura: "Ruptura",
  outro: "Outro",
};

export const PEDIDO_FONTE_LABEL: Record<PedidoFonte, string> = {
  PROTHEUS: "Protheus",
  SALESFORCE: "Salesforce",
  SANKHYA: "Sankhya",
};
