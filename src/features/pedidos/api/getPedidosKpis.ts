// Mitigates: A01 (count via Supabase com RLS aplicável),
//            A10 (erro propagado para react-query; UI mostra texto genérico)
import { publicDb } from "@/lib/supabase";
import type { PedidosKpis } from "../types";

function startOfMonthISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function endOfMonthISO(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
}

async function countWhere(builder: (q: ReturnType<typeof base>) => ReturnType<typeof base>): Promise<number> {
  const q = builder(base());
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

function base() {
  return publicDb
    .from("vw_pedidos" as never)
    .select("*", { count: "exact", head: true });
}

export async function getPedidosKpis(): Promise<PedidosKpis> {
  // total
  const total = await countWhere((q) => q);

  // pendentes
  const pendentes = await countWhere((q) => q.eq("status", "pendente"));

  // faturados no mês
  const inicio = startOfMonthISO();
  const fim = endOfMonthISO();
  const faturados_mes = await countWhere((q) =>
    q.eq("status", "faturado").gte("data_pedido", inicio).lte("data_pedido", fim),
  );

  // valor total (soma de total). Precisamos buscar `total` dos não-cancelados.
  // Como não há agregação SUM via PostgREST, somamos no client em lotes.
  // Limite prático: tabela tem ~5k linhas — aceitável paginar 1x até 5k.
  let valor_total = 0;
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await publicDb
      .from("vw_pedidos" as never)
      .select("total")
      .neq("status", "recusado")
      .neq("status", "ruptura")
      .range(offset, offset + pageSize - 1);
    if (error) throw error;
    const rows = (data ?? []) as { total: number | string | null }[];
    for (const r of rows) {
      const n = typeof r.total === "string" ? Number(r.total) : r.total ?? 0;
      if (Number.isFinite(n)) valor_total += n as number;
    }
    if (rows.length < pageSize) break;
  }

  return { total, pendentes, faturados_mes, valor_total };
}
