// Mitigates: A01.
import { publicDb } from "@/lib/supabase";

export async function removerTabelaPreco(id: string): Promise<void> {
  const { error } = await publicDb.rpc(
    "fn_remover_tabela_preco" as never,
    { p_id: id } as never,
  );
  if (error) throw error;
}
