// Mitigates: A01 (RLS), A05 (id validado antes do query builder), A10 (erro propagado)
//
// Fonte: public.vw_pedido_itens (vem de analytics.FCT_PEDIDOS).
// pedido_id aqui é o md5 calculado em crm.vw_pedidos — bate com Pedido.id.
import { z } from "zod";
import { publicDb } from "@/lib/supabase";
import type { PedidoItem } from "../types";

const idSchema = z.string().min(1).max(64);

type Row = {
  id: string;
  pedido_id: string;
  fonte: string;
  numero: string;
  sequencia: string | null;
  cod_grupo_prod: string | null;
  grupo_nome: string | null;
  grupo_caminho: string | null;
  cod_produto: string | null;
  cod_prod_origem: string | null;
  produto_nome: string | null;
  produto_unidade: string | null;
  qtd: number | string | null;
  vlr_unit: number | string | null;
  vlr_bruto: number | string | null;
  vlr_desc: number | string | null;
  vlr_liq: number | string | null;
};

function num(v: number | string | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function rowToItem(r: Row): PedidoItem {
  return {
    id: r.id,
    sequencia: r.sequencia,
    cod_grupo_prod: r.cod_grupo_prod,
    grupo_nome: r.grupo_nome,
    grupo_caminho: r.grupo_caminho,
    cod_produto: r.cod_produto,
    cod_prod_origem: r.cod_prod_origem,
    produto_nome: r.produto_nome,
    produto_unidade: r.produto_unidade,
    qtd: num(r.qtd),
    vlr_unit: num(r.vlr_unit),
    vlr_bruto: num(r.vlr_bruto),
    vlr_desc: num(r.vlr_desc),
    vlr_liq: num(r.vlr_liq),
  };
}

export async function listPedidoItens(pedidoId: string): Promise<PedidoItem[]> {
  const safeId = idSchema.parse(pedidoId);
  const { data, error } = await publicDb
    .from("vw_pedido_itens" as never)
    .select("*")
    .eq("pedido_id", safeId)
    .order("sequencia", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return ((data ?? []) as Row[]).map(rowToItem);
}
