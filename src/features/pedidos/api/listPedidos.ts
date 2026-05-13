// Mitigates: A01 (consulta via supabase-js + RLS no banco, escopo crm),
//            A05 (filtros validados com zod antes do query builder; sem concat),
//            A10 (erro do Supabase propagado para react-query; UI mostra texto genérico)
//
// Fonte: public.vw_pedidos_lista (UNION ALL de vw_pedidos_enriched + crm.orcamentos).
// Permite aplicar filtros globais (uf, tipo, saúde, score, programa) que
// vivem no cliente — sem nova request. Orcamentos CRM aparecem com fonte='CRM'.
import { publicDb } from "@/lib/supabase";
import { pedidoFiltroSchema } from "../schemas";
import { PEDIDOS_PAGE_SIZE, type Pedido, type PedidoFiltro } from "../types";

export type ListPedidosResult = {
  rows: Pedido[];
  total: number;
};

type Row = {
  id: string;
  fonte: string;
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
  status: Pedido["status"];
  status_raw: string | null;
  itens_count: number | null;
  subtotal: number | string | null;
  desconto: number | string | null;
  total: number | string | null;
  cliente_uf: string | null;
  cliente_cidade: string | null;
  cliente_tipo: string | null;
  cliente_tier: string | null;
  cliente_saude: string | null;
  cliente_score_pagamento: string | null;
  cliente_em_familia: boolean | null;
  cliente_em_pdv: boolean | null;
  cliente_bloqueado: string | null;
  cliente_tem_acordo: boolean | null;
  cliente_total_vencido: number | string | null;
  cliente_limite_pct: number | string | null;
  cliente_dias_sem_compra: number | null;
  cliente_ticket_medio: number | string | null;
  cliente_faturamento_12m: number | string | null;
};

function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function rowToPedido(r: Row): Pedido {
  return {
    id: r.id,
    fonte: r.fonte,
    numero: r.numero,
    cgc_emp: r.cgc_emp,
    numero_nota: r.numero_nota,
    data_pedido: r.data_pedido,
    ano_pedido: r.ano_pedido,
    cgc_parceiro: r.cgc_parceiro,
    cliente_id: r.cliente_id,
    cliente_nome: r.cliente_nome,
    cod_vend: r.cod_vend,
    vendedor_id: r.vendedor_id,
    vendedor_nome: r.vendedor_nome,
    status: r.status,
    status_raw: r.status_raw,
    itens_count: r.itens_count ?? 0,
    subtotal: num(r.subtotal),
    desconto: num(r.desconto),
    total: num(r.total),
    cliente_uf: r.cliente_uf,
    cliente_cidade: r.cliente_cidade,
    cliente_tipo: r.cliente_tipo,
    cliente_tier: r.cliente_tier,
    cliente_saude: r.cliente_saude,
    cliente_score: r.cliente_score_pagamento,
    cliente_em_familia: r.cliente_em_familia === true,
    cliente_em_pdv: r.cliente_em_pdv === true,
    cliente_bloqueado: r.cliente_bloqueado,
    cliente_tem_acordo: r.cliente_tem_acordo === true,
    cliente_total_vencido: num(r.cliente_total_vencido),
    cliente_limite_pct:
      r.cliente_limite_pct == null ? null : num(r.cliente_limite_pct),
    cliente_dias_sem_compra: r.cliente_dias_sem_compra,
    cliente_ticket_medio: num(r.cliente_ticket_medio),
    cliente_faturamento_12m: num(r.cliente_faturamento_12m),
  };
}

export async function listPedidos(filtro: PedidoFiltro): Promise<ListPedidosResult> {
  const safe = pedidoFiltroSchema.parse(filtro);

  let query = publicDb
    .from("vw_pedidos_lista" as never)
    .select("*", { count: "exact" })
    .order("data_pedido", { ascending: false, nullsFirst: false });

  if (safe.busca) {
    query = query.or(`numero.ilike.%${safe.busca}%,cliente_nome.ilike.%${safe.busca}%`);
  }
  if (safe.status) query = query.eq("status", safe.status);
  if (safe.fonte) query = query.eq("fonte", safe.fonte);
  if (safe.vendedor) query = query.eq("vendedor_nome", safe.vendedor);
  // Filtros do cliente (via JOIN)
  if (safe.uf) query = query.eq("cliente_uf", safe.uf);
  if (safe.tipo) query = query.eq("cliente_tipo", safe.tipo);
  if (safe.saude) query = query.eq("cliente_saude", safe.saude);
  if (safe.score) query = query.eq("cliente_score_pagamento", safe.score);
  if (safe.tier) query = query.eq("cliente_tier", safe.tier);
  if (safe.programa === "familia") query = query.eq("cliente_em_familia", true);
  if (safe.programa === "pdv") query = query.eq("cliente_em_pdv", true);
  if (safe.periodo) query = query.eq("ano_pedido", Number(safe.periodo));

  const from = safe.page * PEDIDOS_PAGE_SIZE;
  const to = (safe.page + 1) * PEDIDOS_PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as Row[]).map(rowToPedido);
  return { rows, total: count ?? 0 };
}

export async function listVendedoresPedidos(): Promise<string[]> {
  // Fonte: vw_pedidos_vendedores (view DISTINCT). Sem ela, o cap default de
  // 1000 linhas do PostgREST tira vendedores que ficam fora da primeira página.
  const { data, error } = await publicDb
    .from("vw_pedidos_vendedores" as never)
    .select("vendedor_nome");
  if (error) throw error;
  const rows = (data ?? []) as { vendedor_nome: string | null }[];
  return rows
    .map((d) => d.vendedor_nome)
    .filter((v): v is string => !!v)
    .sort();
}
