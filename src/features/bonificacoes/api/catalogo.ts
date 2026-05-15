// Busca de produtos no catalogo (sem dependencia de tabela de preco).
// Usado em editores de regra de bonificacao para escolher cod_produto.
import { publicDb } from "@/lib/supabase";

export type ProdutoCatalogoRow = {
  cod_produto: string;
  produto_nome: string;
  cod_produto_protheus: string | null;
  grupo: string | null;
  grupo_caminho: string | null;
  unidade: string | null;
};

export async function searchProdutosCatalogo(
  term: string,
): Promise<ProdutoCatalogoRow[]> {
  const { data, error } = await publicDb.rpc(
    "fn_buscar_produtos_catalogo" as never,
    { p_term: term || null } as never,
  );
  if (error) throw error;
  return (data ?? []) as ProdutoCatalogoRow[];
}
