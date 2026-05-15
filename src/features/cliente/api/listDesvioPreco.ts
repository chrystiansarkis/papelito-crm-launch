// Mitigates: A01 (função SECURITY INVOKER — herda RLS do caller),
//            (Sprint Análise) consome public.fn_cliente_desvio_preco(uuid).
import { publicDb } from "@/lib/supabase";
import type { DesvioPrecoRow } from "../types";

export async function listClienteDesvioPreco(clienteId: string): Promise<DesvioPrecoRow[]> {
  const { data, error } = await publicDb.rpc("fn_cliente_desvio_preco" as never, {
    p_cliente_id: clienteId,
  } as never);
  if (error) throw error;
  return (data ?? []) as DesvioPrecoRow[];
}
