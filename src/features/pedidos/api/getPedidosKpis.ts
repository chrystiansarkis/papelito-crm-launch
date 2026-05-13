// Mitigates: A01 (count com RLS aplicável),
//            A05 (filtros validados pelo schema antes do query builder),
//            A10 (erro propagado para react-query)
//
// Os filtros globais são aplicados igual à listPedidos — o header (total +
// valor total) bate com a lista exibida. valor_total = sum(total) das linhas
// que casam o filtro; PostgREST não tem SUM nativo, então paginamos no client
// em lotes de 1000.
import { publicDb } from "@/lib/supabase";
import { pedidoFiltroSchema } from "../schemas";
import type { PedidoFiltro, PedidosKpis } from "../types";

type Filtered = {
  eq: (...args: any[]) => Filtered;
  or: (...args: any[]) => Filtered;
};

function base() {
  return publicDb.from("vw_pedidos_lista" as never);
}

function applyFilters<T extends { eq: (...args: any[]) => T; or: (...args: any[]) => T }>(
  q: T,
  safe: ReturnType<typeof pedidoFiltroSchema.parse>,
): T {
  let out = q;
  if (safe.busca) {
    out = out.or(`numero.ilike.%${safe.busca}%,cliente_nome.ilike.%${safe.busca}%`);
  }
  if (safe.status) out = out.eq("status", safe.status);
  if (safe.fonte) out = out.eq("fonte", safe.fonte);
  if (safe.vendedor) out = out.eq("vendedor_nome", safe.vendedor);
  if (safe.uf) out = out.eq("cliente_uf", safe.uf);
  if (safe.tipo) out = out.eq("cliente_tipo", safe.tipo);
  if (safe.saude) out = out.eq("cliente_saude", safe.saude);
  if (safe.score) out = out.eq("cliente_score_pagamento", safe.score);
  if (safe.tier) out = out.eq("cliente_tier", safe.tier);
  if (safe.programa === "familia") out = out.eq("cliente_em_familia", true);
  if (safe.programa === "pdv") out = out.eq("cliente_em_pdv", true);
  if (safe.periodo) out = out.eq("ano_pedido", Number(safe.periodo));
  return out;
}

export async function getPedidosKpis(filtros: PedidoFiltro): Promise<PedidosKpis> {
  const safe = pedidoFiltroSchema.parse(filtros);

  // total (count exact, head=true não traz rows)
  const totalQuery = applyFilters(
    base().select("*", { count: "exact", head: true }) as unknown as Filtered,
    safe,
  );
  const { count: total, error: errTotal } = (await (totalQuery as unknown as Promise<{ count: number | null; error: unknown }>));
  if (errTotal) throw errTotal as Error;

  // pendentes — força o filtro mesmo se o usuário tiver outro status escolhido
  const pendQuery = base().select("*", { count: "exact", head: true }).eq("status", "pendente");
  const { count: pendentes, error: errPend } = (await pendQuery) as { count: number | null; error: unknown };
  if (errPend) throw errPend as Error;

  // faturados_mes — mesma ideia, KPI fixo (não respeita filtro de status)
  const now = new Date();
  const inicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const fim = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const fatQuery = base()
    .select("*", { count: "exact", head: true })
    .eq("status", "faturado")
    .gte("data_pedido", inicio)
    .lte("data_pedido", fim);
  const { count: faturados_mes, error: errFat } = (await fatQuery) as { count: number | null; error: unknown };
  if (errFat) throw errFat as Error;

  // valor_total (filtered) — paginamos. Se o filtro reduz bem o universo,
  // são poucas páginas. Se for o conjunto todo (~5k), são 5 lotes.
  let valor_total = 0;
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const lote = applyFilters(
      base().select("total") as unknown as Filtered,
      safe,
    );
    const { data, error } = (await (lote as unknown as { range: (a: number, b: number) => Promise<unknown> }).range(
      offset,
      offset + pageSize - 1,
    )) as { data: { total: number | string | null }[] | null; error: unknown };
    if (error) throw error as Error;
    const rows = data ?? [];
    for (const r of rows) {
      const n = typeof r.total === "string" ? Number(r.total) : r.total ?? 0;
      if (Number.isFinite(n)) valor_total += n as number;
    }
    if (rows.length < pageSize) break;
  }

  return {
    total: total ?? 0,
    pendentes: pendentes ?? 0,
    faturados_mes: faturados_mes ?? 0,
    valor_total,
  };
}
