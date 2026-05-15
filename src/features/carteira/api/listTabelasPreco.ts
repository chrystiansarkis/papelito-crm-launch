// Mitigates: A01 (view publica le SO de crm.tabela_preco, que e a fonte
// da verdade — staging do Salesforce foi importada one-shot e nao e
// consultada em runtime).
//
// `origem` indica se a tabela foi criada manualmente no CRM ('crm') ou
// importada do Salesforce ('salesforce_import'). A UX e a mesma para
// ambas; o badge serve so para diferenciar visualmente.
import { publicDb } from "@/lib/supabase";

export type TabelaPrecoOption = {
  id: string;
  nome: string;
  ativo: boolean;
  origem: "crm" | "salesforce_import";
  observacao: string | null;
};

export async function listTabelasPreco(): Promise<TabelaPrecoOption[]> {
  const { data, error } = await publicDb
    .from("vw_tabelas_preco" as never)
    .select("id, nome, ativo, origem, observacao")
    .order("nome", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TabelaPrecoOption[];
}
