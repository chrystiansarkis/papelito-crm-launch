// Mitigates: A01, A10
import { publicDb } from "@/lib/supabase";
import type { Contato } from "../types";

export async function listClienteContatos(clienteId: string): Promise<Contato[]> {
  const { data, error } = await publicDb
    .from("vw_cliente_contatos" as never)
    .select("id,cliente_id,nome,cargo,funcao,email,telefones,principal,recebe_cobranca,recebe_nf,observacoes")
    .eq("cliente_id", clienteId)
    .order("principal", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Contato[]);
}
