// Mitigates: A01 — RPC SECURITY DEFINER (soft delete via fn_remover_produto_config).
import { publicDb } from "@/lib/supabase";

export async function removerProdutoConfig(codProduto: string): Promise<void> {
  const { error } = await publicDb.rpc(
    "fn_remover_produto_config" as never,
    { p_cod_produto: codProduto } as never,
  );
  if (error) throw error;
}
