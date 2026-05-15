// Mitigates: A01 (RPC SECURITY DEFINER), A05 (re-valida no servidor).
//
// Substitui o conjunto de itens (produto+preco) da tabela em uma unica
// transacao: itens NAO presentes no payload sao apagados.
import { publicDb } from "@/lib/supabase";
import type { TabelaPrecoItemForm } from "../schemas.tabela";

export type ItensTabelaLotePayload = {
  tabela_preco_id: string;
  itens: TabelaPrecoItemForm[];
};

export async function salvarItensTabelaLote(
  input: ItensTabelaLotePayload,
): Promise<number> {
  const payload = {
    tabela_preco_id: input.tabela_preco_id,
    itens: input.itens.map((i) => ({
      cod_produto: i.cod_produto,
      vlr_unit: i.vlr_unit,
      vlr_desc_sugerido_pct: i.vlr_desc_sugerido_pct,
      observacao: i.observacao || null,
    })),
  };
  const { data, error } = await publicDb.rpc(
    "fn_salvar_itens_tabela_lote" as never,
    { payload } as never,
  );
  if (error) throw error;
  return Number(data) || 0;
}
