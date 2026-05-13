// Mitigates: A01 (RPC SECURITY INVOKER), A05 (params tipados)
import { publicDb } from "@/lib/supabase";
import type { VendaMensal } from "../types";

export async function listVendasMensais(
  clienteId: string,
  meses = 24,
): Promise<VendaMensal[]> {
  const { data, error } = await publicDb.rpc("fn_vendas_mensais_cliente" as never, {
    p_cliente_id: clienteId,
    p_meses: meses,
  });
  if (error) throw error;
  return ((data ?? []) as VendaMensal[]).map((r) => ({
    mes: String(r.mes),
    valor: Number(r.valor ?? 0),
  }));
}