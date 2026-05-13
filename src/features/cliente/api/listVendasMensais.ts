// Mitigates: A01 (RPC SECURITY INVOKER), A05 (params tipados)
import { publicDb } from "@/lib/supabase";
import type { VendaMensal } from "../types";

export async function listVendasMensais(
  clienteId: string,
  // Sprint 2.6c — default 84 (7 anos) pra alimentar tooltip enriquecido do
  // FaturamentoAnualCard. Cache longa via React Query absorve o custo.
  meses = 84,
): Promise<VendaMensal[]> {
  const { data, error } = await (publicDb.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>)("fn_vendas_mensais_cliente", {
    p_cliente_id: clienteId,
    p_meses: meses,
  });
  if (error) throw error;
  return ((data ?? []) as VendaMensal[]).map((r) => ({
    mes: String(r.mes),
    valor: Number(r.valor ?? 0),
  }));
}