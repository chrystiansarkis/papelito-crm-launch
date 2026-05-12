// Mitigates: A01, A10
import { publicDb } from "@/lib/supabase";
import type { Pedido } from "../types";

export async function listClientePedidos(clienteId: string): Promise<Pedido[]> {
  const { data, error } = await publicDb
    .from("vw_cliente_pedidos" as never)
    .select("*")
    .eq("cliente_id", clienteId)
    .order("data_negociacao", { ascending: false })
    .limit(20);
  if (error) throw error;
  return ((data ?? []) as Pedido[]);
}
