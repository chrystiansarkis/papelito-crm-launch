// Mitigates: A01, A10
import { publicDb } from "@/lib/supabase";
import type { Observacao } from "../types";

export async function listClienteObservacoes(clienteId: string): Promise<Observacao[]> {
  const { data, error } = await publicDb
    .from("vw_cliente_observacoes" as never)
    .select("*")
    .eq("cliente_id", clienteId)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Observacao[]);
}
