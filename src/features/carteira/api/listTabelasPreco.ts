// Mitigates: A01 (view publica em cima de staging."DIM_TABELAS-PRECO_SALESFORCE" filtrada por ATIVO=true)
//
// Lista tabelas de preco do Salesforce para o select de cadastro de cliente.
// O ID e o codigo Salesforce (text). E gravado em crm.cliente_crm.tabela_preco_id.
import { publicDb } from "@/lib/supabase";

export type TabelaPrecoOption = {
  id: string;
  nome: string;
  ativo: boolean;
};

export async function listTabelasPreco(): Promise<TabelaPrecoOption[]> {
  const { data, error } = await publicDb
    .from("vw_tabelas_preco" as never)
    .select("id, nome, ativo")
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TabelaPrecoOption[];
}
