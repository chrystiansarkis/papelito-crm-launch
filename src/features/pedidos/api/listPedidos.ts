// Mitigates: A01 (consulta via supabase-js + RLS no banco, escopo crm),
//            A05 (filtros validados com zod antes do query builder; sem concat),
//            A10 (erro do Supabase propagado para react-query; UI mostra texto genérico)
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
};

function toNumber(v: number | string | null): number {
  if (v === null || v === undefined) return 0;
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
    cgc_parceiro: r.cgc_parceiro,
    cliente_id: r.cliente_id,
    cliente_nome: r.cliente_nome,
    cod_vend: r.cod_vend,
    vendedor_id: r.vendedor_id,
    vendedor_nome: r.vendedor_nome,
    status: r.status,
    status_raw: r.status_raw,
    itens_count: r.itens_count ?? 0,
    subtotal: toNumber(r.subtotal),
    desconto: toNumber(r.desconto),
    total: toNumber(r.total),
  };
}

export async function listPedidos(filtro: PedidoFiltro): Promise<ListPedidosResult> {
  const safe = pedidoFiltroSchema.parse(filtro);

  let query = publicDb
    .from("vw_pedidos" as never)
    .select("*", { count: "exact" })
    .order("data_pedido", { ascending: false, nullsFirst: false });

  if (safe.busca) {
    // ilike em numero OR cliente_nome via or() — Supabase aceita filtro composto
    query = query.or(`numero.ilike.%${safe.busca}%,cliente_nome.ilike.%${safe.busca}%`);
  }
  if (safe.status) query = query.eq("status", safe.status);
  if (safe.fonte) query = query.eq("fonte", safe.fonte);
  if (safe.vendedor) query = query.eq("vendedor_nome", safe.vendedor);

  const from = safe.page * PEDIDOS_PAGE_SIZE;
  const to = (safe.page + 1) * PEDIDOS_PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as Row[]).map(rowToPedido);
  return { rows, total: count ?? 0 };
}

export async function listVendedoresPedidos(): Promise<string[]> {
  const { data, error } = await publicDb
    .from("vw_pedidos" as never)
    .select("vendedor_nome")
    .not("vendedor_nome", "is", null);
  if (error) throw error;
  const rows = (data ?? []) as { vendedor_nome: string | null }[];
  return Array.from(
    new Set(rows.map((d) => d.vendedor_nome).filter((v): v is string => !!v)),
  ).sort();
}
