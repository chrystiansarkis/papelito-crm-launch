// Mitigates: A01 (RLS via view), A05 (clienteId validado).
import { publicDb } from "@/lib/supabase";
import type { SkuPerdido } from "../types";

export async function listSkusPerdidos(clienteId: string): Promise<SkuPerdido[]> {
  const { data, error } = await publicDb
    .from("vw_cliente_skus_perdidos" as never)
    .select("cliente_id,cod_produto,nome_produto,ultima_compra,dias_sem_compra,valor_medio_mensal")
    .eq("cliente_id", clienteId)
    .order("valor_medio_mensal", { ascending: false })
    .limit(20);
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map<SkuPerdido>((r) => ({
    cliente_id: r.cliente_id as string,
    cod_produto: r.cod_produto as string,
    nome_produto: (r.nome_produto as string | null) ?? null,
    ultima_compra: r.ultima_compra as string,
    dias_sem_compra: Number(r.dias_sem_compra) || 0,
    valor_medio_mensal: Number(r.valor_medio_mensal) || 0,
  }));
}