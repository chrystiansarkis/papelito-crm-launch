// Mitigates: A01, A10
import { publicDb } from "@/lib/supabase";
import type { PadraoCompraRow } from "../types";

export async function getPadraoCompra(clienteId: string): Promise<PadraoCompraRow | null> {
  const { data, error } = await publicDb
    .from("vw_cliente_padrao_compra" as never)
    .select("*")
    .eq("cliente_id", clienteId)
    .maybeSingle();
  if (error) throw error;
  return (data as PadraoCompraRow | null) ?? null;
}