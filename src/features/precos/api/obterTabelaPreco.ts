// Mitigates: A01 (RPC SECURITY DEFINER).
import { publicDb } from "@/lib/supabase";
import type { TabelaPrecoDetalhe } from "../schemas.tabela";

export async function obterTabelaPreco(id: string): Promise<TabelaPrecoDetalhe | null> {
  const { data, error } = await publicDb.rpc(
    "fn_obter_tabela_preco" as never,
    { p_id: id } as never,
  );
  if (error) throw error;
  const row = ((data ?? []) as TabelaPrecoDetalhe[])[0];
  return row ?? null;
}
