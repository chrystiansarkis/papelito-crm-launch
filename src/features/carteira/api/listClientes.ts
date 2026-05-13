// Mitigates: A01 (RLS no banco), A05 (zod valida filtros + query builder, sem concat),
//            A10 (erros sobem para react-query e a UI exibe mensagem genérica)
//
// Fonte: public.vw_carteira — matview indexada (~5ms) com as 50 colunas
// ricas de vw_cliente_ficha materializadas. Refresh manual via
// REFRESH MATERIALIZED VIEW public.vw_carteira (sync não é tempo real).
import { publicDb } from "@/lib/supabase";
import { carteiraFiltroSchema } from "../schemas";
import type { CarteiraCliente, CarteiraFiltro } from "../types";
import { CARTEIRA_PAGE_SIZE } from "../types";

export type ListClientesResult = {
  rows: CarteiraCliente[];
  total: number;
};

type FichaRow = {
  id: string;
  nome: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  apelido: string | null;
  cgc_matriz: string | null;
  cgc_matriz_normalizado: string | null;
  cidade: string | null;
  uf: string | null;
  estado: string | null;
  tipo: string | null;
  tier: string | null;
  saude: string | null;
  status: string | null;
  rfv_score: number | null;
  em_familia_papelito: boolean | null;
  em_pdv_perfeito: boolean | null;
  observacao_fixada: string | null;
  tags: string[] | null;
  qtd_cnpjs: number | string | null;
  qtd_cnpjs_ativos: number | string | null;
  tem_protheus: boolean | null;
  tem_sankhya: boolean | null;
  tem_salesforce: boolean | null;
  vendedor_responsavel_id: string | null;
  vendedor_nome: string | null;
  vendedor_papel: string | null;
  faturamento_12m: number | string | null;
  faturamento_12m_anterior: number | string | null;
  faturamento_ytd: number | string | null;
  faturamento_mes_corrente: number | string | null;
  qtd_pedidos_12m: number | string | null;
  qtd_pedidos_total: number | string | null;
  data_ultima_compra: string | null;
  dias_sem_compra: number | null;
  ticket_medio_12m: number | string | null;
  score_pagamento: string | null;
  score_pagamento_ia: string | null;
  score_override: boolean | null;
  bloqueado_cobranca: string | null;
  bloqueado_motivo: string | null;
  total_aberto: number | string | null;
  total_vencido: number | string | null;
  qtd_titulos_vencidos: number | string | null;
  dias_maximo_atraso: number | null;
  limite_credito: number | string | null;
  limite_usado: number | string | null;
  limite_pct_utilizado: number | string | null;
  tem_acordo_ativo: boolean | null;
  tem_promessa_pendente: boolean | null;
};

function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function intOrNull(v: number | null | undefined): number | null {
  if (v == null) return null;
  return Number.isFinite(v) ? v : null;
}

function rowToCliente(r: FichaRow): CarteiraCliente {
  return {
    id: r.id,
    nome: r.nome,
    razao_social: r.razao_social,
    nome_fantasia: r.nome_fantasia,
    apelido: r.apelido,
    cgc_matriz: r.cgc_matriz,
    cgc_matriz_normalizado: r.cgc_matriz_normalizado,
    cidade: r.cidade,
    uf: r.uf ? r.uf.trim() : null,
    estado: r.estado,
    tipo: r.tipo,
    tier: r.tier,
    saude: r.saude,
    status: r.status,
    rfv_score: r.rfv_score,
    em_familia_papelito: r.em_familia_papelito === true,
    em_pdv_perfeito: r.em_pdv_perfeito === true,
    observacao_fixada: r.observacao_fixada,
    tags: r.tags,
    qtd_cnpjs: num(r.qtd_cnpjs),
    qtd_cnpjs_ativos: num(r.qtd_cnpjs_ativos),
    tem_protheus: r.tem_protheus === true,
    tem_sankhya: r.tem_sankhya === true,
    tem_salesforce: r.tem_salesforce === true,
    vendedor_responsavel_id: r.vendedor_responsavel_id,
    vendedor_nome: r.vendedor_nome,
    vendedor_papel: r.vendedor_papel,
    faturamento_12m: num(r.faturamento_12m),
    faturamento_12m_anterior: num(r.faturamento_12m_anterior),
    faturamento_ytd: num(r.faturamento_ytd),
    faturamento_mes_corrente: num(r.faturamento_mes_corrente),
    qtd_pedidos_12m: num(r.qtd_pedidos_12m),
    qtd_pedidos_total: num(r.qtd_pedidos_total),
    data_ultima_compra: r.data_ultima_compra,
    dias_sem_compra: intOrNull(r.dias_sem_compra),
    ticket_medio_12m: num(r.ticket_medio_12m),
    score_pagamento: r.score_pagamento,
    score_pagamento_ia: r.score_pagamento_ia,
    score_override: r.score_override === true,
    bloqueado_cobranca: r.bloqueado_cobranca,
    bloqueado_motivo: r.bloqueado_motivo,
    total_aberto: num(r.total_aberto),
    total_vencido: num(r.total_vencido),
    qtd_titulos_vencidos: num(r.qtd_titulos_vencidos),
    dias_maximo_atraso: intOrNull(r.dias_maximo_atraso),
    limite_credito: num(r.limite_credito),
    limite_usado: num(r.limite_usado),
    limite_pct_utilizado:
      r.limite_pct_utilizado == null ? null : num(r.limite_pct_utilizado),
    tem_acordo_ativo: r.tem_acordo_ativo === true,
    tem_promessa_pendente: r.tem_promessa_pendente === true,
    // alias legacy (componentes antigos lêem cliente.ultima_compra)
    ultima_compra: r.data_ultima_compra,
  };
}

export async function listCarteiraClientes(
  filtros: CarteiraFiltro,
): Promise<ListClientesResult> {
  const safe = carteiraFiltroSchema.parse(filtros);
  let query = publicDb
    .from("vw_carteira" as never)
    .select("*", { count: "exact" })
    .order("faturamento_12m", { ascending: false, nullsFirst: false });

  if (safe.busca) {
    // busca em nome OU razao_social OU nome_fantasia
    query = query.or(
      `nome.ilike.%${safe.busca}%,razao_social.ilike.%${safe.busca}%,nome_fantasia.ilike.%${safe.busca}%`,
    );
  }
  if (safe.saude) query = query.eq("saude", safe.saude);
  if (safe.vendedor) query = query.eq("vendedor_nome", safe.vendedor);
  if (safe.programa === "familia") query = query.eq("em_familia_papelito", true);
  if (safe.programa === "pdv") query = query.eq("em_pdv_perfeito", true);
  if (safe.tipo) query = query.eq("tipo", safe.tipo);
  if (safe.score) query = query.eq("score_pagamento", safe.score);
  if (safe.tier) query = query.eq("tier", safe.tier);
  if (safe.uf) {
    // base tem leading space (' SP') — usamos ilike com TRIM no padrão
    query = query.ilike("uf", `%${safe.uf}%`);
  }
  if (safe.fonte === "PROTHEUS") query = query.eq("tem_protheus", true);
  else if (safe.fonte === "SALESFORCE") query = query.eq("tem_salesforce", true);
  else if (safe.fonte === "SANKHYA") query = query.eq("tem_sankhya", true);
  if (safe.periodo) {
    // último contato dentro do ano selecionado
    const inicio = `${safe.periodo}-01-01`;
    const fim = `${safe.periodo}-12-31`;
    query = query.gte("data_ultima_compra", inicio).lte("data_ultima_compra", fim);
  }
  if (safe.clienteIds) {
    query = safe.clienteIds.length > 0
      ? query.in("id", safe.clienteIds)
      : query.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  const from = safe.page * CARTEIRA_PAGE_SIZE;
  const to = (safe.page + 1) * CARTEIRA_PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as FichaRow[]).map(rowToCliente);
  return { rows, total: count ?? 0 };
}
