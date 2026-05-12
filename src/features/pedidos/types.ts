// Mitigates: A05 (modelagem de tipos; filtros validados antes de virarem query)
//
// Pedido reflete o header de crm.vw_pedidos (1 linha por NUMERO_UNICO),
// que agrega analytics.FCT_PEDIDOS (Protheus + Salesforce). É read-only.

export type PedidoFonte = "PROTHEUS" | "SALESFORCE";

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
  cod_produto: string | null;
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
};

export type PedidosKpis = {
  total: number;
  valor_total: number;
  pendentes: number;
  faturados_mes: number;
};

export type PedidoFiltro = {
  busca: string;
  status: "" | PedidoStatus;
  fonte: "" | PedidoFonte;
  vendedor: string;
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
};
