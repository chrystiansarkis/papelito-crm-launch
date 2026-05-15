// Mitigates: A01 (RPC SECURITY DEFINER; tabela crm.tabela_preco_desconto exposta so via funcao)
import { publicDb } from "@/lib/supabase";
import type { DescontoRow } from "../schemas.desconto";

export async function listDescontos(tabelaPrecoId: string): Promise<DescontoRow[]> {
  const { data, error } = await publicDb.rpc(
    "fn_listar_descontos" as never,
    { p_tabela_preco_id: tabelaPrecoId } as never,
  );
  if (error) throw error;
  return (data ?? []) as unknown as DescontoRow[];
}
