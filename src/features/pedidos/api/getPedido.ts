// Mitigates: A01 (RLS no banco), A05 (id validado antes do query builder),
//            A10 (erro do Supabase propagado para react-query; UI mostra texto genérico)
//
// Fonte: public.vw_pedidos_enriched. Pedidos são read-only (origem ERP) — esta
// API só lê o header completo de um pedido específico.
import { z } from "zod";
import { publicDb } from "@/lib/supabase";
import type { Pedido } from "../types";

const idSchema = z.string().min(1).max(64);

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

export async function getPedido(id: string): Promise<Pedido | null> {
  const safeId = idSchema.parse(id);
  const { data, error } = await publicDb
    .from("vw_pedidos_enriched" as never)
    .select("*")
    .eq("id", safeId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToPedido(data as Row);
}
