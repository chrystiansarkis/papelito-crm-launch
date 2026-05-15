// Mitigates: A01 (RPC SECURITY DEFINER no banco; tabela crm.produto_config nao
//            e exposta diretamente — leitura via fn_listar_produto_config)
import { publicDb } from "@/lib/supabase";
import type { ProdutoConfigRow } from "../schemas.produtoConfig";

export type ListProdutoConfigInput = {
  term?: string;
  apenasConfig?: boolean;
  limit?: number;
  offset?: number;
};

export async function listProdutoConfig(
  input: ListProdutoConfigInput = {},
): Promise<ProdutoConfigRow[]> {
  const { data, error } = await publicDb.rpc("fn_listar_produto_config" as never, {
    p_term: input.term ?? null,
    p_apenas_config: input.apenasConfig ?? false,
    p_limit: input.limit ?? 50,
    p_offset: input.offset ?? 0,
  } as never);
  if (error) throw error;
  return (data ?? []) as unknown as ProdutoConfigRow[];
}
