// Mitigates: A01 (RPC SECURITY DEFINER faz join staging + crm).
import { publicDb } from "@/lib/supabase";
import type { TabelaPrecoItemRow } from "../schemas.tabela";

export async function listItensTabela(
  tabelaPrecoId: string,
): Promise<TabelaPrecoItemRow[]> {
  const { data, error } = await publicDb.rpc(
    "fn_listar_itens_tabela" as never,
    { p_tabela_preco_id: tabelaPrecoId } as never,
  );
  if (error) throw error;
  type Row = {
    cod_produto: string;
    produto_nome: string;
    cod_produto_protheus: string | null;
    unidade: string | null;
    grupo: string | null;
    grupo_caminho: string | null;
    vlr_unit: number | string;
    vlr_desc_sugerido_pct: number | string;
    origem_preco: "crm" | "salesforce";
    observacao: string | null;
  };
  return ((data ?? []) as Row[]).map((r) => ({
    cod_produto: r.cod_produto,
    produto_nome: r.produto_nome,
    cod_produto_protheus: r.cod_produto_protheus,
    unidade: r.unidade,
    grupo: r.grupo,
    grupo_caminho: r.grupo_caminho,
    vlr_unit: Number(r.vlr_unit) || 0,
    vlr_desc_sugerido_pct: Number(r.vlr_desc_sugerido_pct) || 0,
    origem_preco: r.origem_preco,
    observacao: r.observacao,
  }));
}
